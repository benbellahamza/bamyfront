import { Component, OnInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface Camion {
  id?: number;
  numeroChassis: string;
  marque: string;
  modele: string;
  nomChauffeur: string;
  prenomChauffeur: string;
  dateEntree?: string;
  dateSortie?: string;
  destination?: string;
  statut?: 'ENTREE' | 'SORTIE';
  dateEntreeFormatee?: string;
  dateSortieFormatee?: string;
}

@Component({
  selector: 'app-admin-livraison',
  standalone: false,
  templateUrl: './admin-livraison.component.html',
  styleUrls: ['./admin-livraison.component.css']
})
export class AdminLivraisonComponent implements OnInit {
  camions: Camion[] = [];
  camionsFiltres: Camion[] = [];
  selectedCamions: Camion[] = [];
  filtreStatut: 'TOUS' | 'ENTREE' | 'SORTIE' = 'TOUS';
  loading: boolean = false;

  // Propriétés pour la recherche et les filtres
  searchTerm: string = '';
  startDate: string = '';
  endDate: string = '';

  // Propriétés pour le tri
  triActuel: string = 'date_desc';

  // Propriétés pour l'utilisateur
  utilisateur = {
    nom: '',
    prenom: '',
    email: '',
    role: ''
  };

  // Propriétés pour le menu et la modale
  menuOuvert: boolean = false;
  modalePasswordVisible = false;
  motDePasseVisible = false;
  confirmationVisible = false;
  confirmationMotDePasse: string = '';
  ancienMotDePasse: string = '';
  nouveauMotDePasse: string = '';
  messageSuccess: string = '';
  messageErreur: string = '';

  // Propriétés pour la pagination
  currentPage: number = 1;
  itemsPerPage: number = 12;

  // Propriété pour les erreurs d'export
  erreurExport: boolean = false;

  // Référence Math pour l'utilisation dans le template
  Math = Math;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.recupererInfosUtilisateur();
    this.chargerCamions();
  }

  get nomComplet(): string {
    return `${this.utilisateur.nom} ${this.utilisateur.prenom}`.trim();
  }

  recupererInfosUtilisateur() {
    const token = localStorage.getItem('access-token');
    if (!token) {
      this.router.navigate(['/']);
      return;
    }

    try {
      const payload = token.split('.')[1];
      const decodedPayload = atob(payload);
      const decoded = JSON.parse(decodedPayload);

      this.utilisateur = {
        nom: decoded.nom || '',
        prenom: decoded.prenom || '',
        email: decoded.sub || '',
        role: decoded.scope || 'ADMIN'
      };
    } catch (e) {
      console.error('Erreur de décodage du JWT :', e);
      this.logout();
    }
  }

  ouvrirModalePassword() {
    this.modalePasswordVisible = true;
    this.messageErreur = '';
    this.messageSuccess = '';
    this.menuOuvert = false;
  }

  fermerModalePassword() {
    this.modalePasswordVisible = false;
    this.ancienMotDePasse = '';
    this.nouveauMotDePasse = '';
    this.confirmationMotDePasse = '';
    this.messageErreur = '';
    this.messageSuccess = '';
  }

  changerMotDePasse() {
    if (!this.ancienMotDePasse || !this.nouveauMotDePasse) {
      this.messageErreur = "Veuillez remplir tous les champs.";
      this.messageSuccess = "";
      return;
    }

    if (this.nouveauMotDePasse !== this.confirmationMotDePasse) {
      this.messageErreur = "Les mots de passe ne correspondent pas.";
      this.messageSuccess = "";
      return;
    }

    const payload = {
      ancienMotDePasse: this.ancienMotDePasse,
      nouveauMotDePasse: this.nouveauMotDePasse
    };

    this.http.post('http://localhost:8085/auth/update-password', payload).subscribe({
      next: (res: any) => {
        this.messageSuccess = res.message || "✅ Mot de passe mis à jour avec succès.";
        this.messageErreur = "";
        this.ancienMotDePasse = '';
        this.nouveauMotDePasse = '';
        this.confirmationMotDePasse = '';
        
        // Fermer automatiquement la modale après 2 secondes
        setTimeout(() => {
          this.fermerModalePassword();
        }, 2000);
      },
      error: (err) => {
        this.messageErreur = err.error?.error || "❌ Erreur lors de la mise à jour du mot de passe.";
        this.messageSuccess = "";
      }
    });
  }

  get pages(): number[] {
    const total = Math.ceil(this.camionsFiltres.length / this.itemsPerPage);
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  // Nouvelle méthode pour afficher seulement les pages visibles dans la pagination
  getVisiblePages(): number[] {
    const totalPages = this.pages.length;
    const current = this.currentPage;
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      return this.pages;
    }

    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  chargerCamions(): void {
    this.loading = true;
    this.http.get<Camion[]>('http://localhost:8085/api/livraison/all').subscribe({
      next: (data) => {
        this.camions = data.map(camion => ({
          ...camion,
          statut: (camion.dateSortie ? 'SORTIE' : 'ENTREE') as 'ENTREE' | 'SORTIE',
          dateEntreeFormatee: this.formatDate(camion.dateEntree),
          dateSortieFormatee: camion.dateSortie ? this.formatDate(camion.dateSortie) : ''
        }));
        this.appliquerFiltres();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement camions', err);
        this.loading = false;
      }
    });
  }

  appliquerFiltres(): void {
    let filtres = [...this.camions];

    // Filtre par statut
    if (this.filtreStatut !== 'TOUS') {
      filtres = filtres.filter(c => c.statut === this.filtreStatut);
    }

    // Filtre par terme de recherche
    if (this.searchTerm) {
      const terme = this.searchTerm.toLowerCase().trim();
      filtres = filtres.filter(c =>
        c.numeroChassis.toLowerCase().includes(terme) ||
        c.marque.toLowerCase().includes(terme) ||
        c.modele.toLowerCase().includes(terme) ||
        c.nomChauffeur.toLowerCase().includes(terme) ||
        c.prenomChauffeur.toLowerCase().includes(terme) ||
        (c.destination && c.destination.toLowerCase().includes(terme))
      );
    }

    // Filtre par date
    if (this.startDate || this.endDate) {
      const start = this.startDate ? new Date(this.startDate) : new Date(0);
      const end = this.endDate ? new Date(this.endDate) : new Date();
      if (this.endDate) {
        end.setHours(23, 59, 59, 999);
      }

      filtres = filtres.filter(c => {
        if (!c.dateEntree) return false;
        const dateEntree = new Date(c.dateEntree);
        return dateEntree >= start && dateEntree <= end;
      });
    }

    this.camionsFiltres = filtres;
    this.trierCamions(); // Appliquer le tri après les filtres
    this.currentPage = 1;
  }

  // ✨ MÉTHODES DE TRI AVANCÉES
  trierCamions(): void {
    switch (this.triActuel) {
      case 'date_desc':
        this.camionsFiltres.sort((a, b) => {
          const dateA = new Date(a.dateEntree || '').getTime();
          const dateB = new Date(b.dateEntree || '').getTime();
          return dateB - dateA; // Plus récent en premier
        });
        break;
      
      case 'date_asc':
        this.camionsFiltres.sort((a, b) => {
          const dateA = new Date(a.dateEntree || '').getTime();
          const dateB = new Date(b.dateEntree || '').getTime();
          return dateA - dateB; // Plus ancien en premier
        });
        break;
      
      case 'marque_asc':
        this.camionsFiltres.sort((a, b) => 
          a.marque.localeCompare(b.marque)
        );
        break;
      
      case 'marque_desc':
        this.camionsFiltres.sort((a, b) => 
          b.marque.localeCompare(a.marque)
        );
        break;
      
      case 'chauffeur_asc':
        this.camionsFiltres.sort((a, b) => {
          const nomA = `${a.nomChauffeur} ${a.prenomChauffeur}`.trim();
          const nomB = `${b.nomChauffeur} ${b.prenomChauffeur}`.trim();
          return nomA.localeCompare(nomB);
        });
        break;
      
      case 'chauffeur_desc':
        this.camionsFiltres.sort((a, b) => {
          const nomA = `${a.nomChauffeur} ${a.prenomChauffeur}`.trim();
          const nomB = `${b.nomChauffeur} ${b.prenomChauffeur}`.trim();
          return nomB.localeCompare(nomA);
        });
        break;
      
      case 'statut_asc':
        this.camionsFiltres.sort((a, b) => {
          if (a.statut === 'ENTREE' && b.statut === 'SORTIE') return -1;
          if (a.statut === 'SORTIE' && b.statut === 'ENTREE') return 1;
          return 0;
        });
        break;
      
      case 'statut_desc':
        this.camionsFiltres.sort((a, b) => {
          if (a.statut === 'SORTIE' && b.statut === 'ENTREE') return -1;
          if (a.statut === 'ENTREE' && b.statut === 'SORTIE') return 1;
          return 0;
        });
        break;
    }
  }

  filtrerParStatut(statut: 'TOUS' | 'ENTREE' | 'SORTIE'): void {
    this.filtreStatut = statut;
    this.appliquerFiltres();
  }

  rechercher(): void {
    this.currentPage = 1; // Réinitialiser à la première page lors de la recherche
    this.appliquerFiltres();
  }

  filtrerParDate(): void {
    this.currentPage = 1; // Réinitialiser à la première page lors du filtrage
    this.appliquerFiltres();
  }

  // Méthodes pour les statistiques du dashboard
  getCamionsEntres(): number {
    return this.camions.filter(c => c.statut === 'ENTREE').length;
  }

  getCamionsSortis(): number {
    return this.camions.filter(c => c.statut === 'SORTIE').length;
  }

  getCamionsByStatut(statut: 'ENTREE' | 'SORTIE'): Camion[] {
    return this.camions.filter(c => c.statut === statut);
  }

  enregistrerSortie(camion: Camion): void {
    if (!camion.numeroChassis) return;
    
    if (confirm(`Voulez-vous vraiment enregistrer la sortie du camion ${camion.numeroChassis} ?`)) {
      const payload = {
        nomChauffeurSortie: camion.nomChauffeur,
        prenomChauffeurSortie: camion.prenomChauffeur,
        cinChauffeurSortie: 'CIN_PLACEHOLDER'
      };

      this.http.post(`http://localhost:8085/api/livraison/sortie/${camion.numeroChassis}`, payload).subscribe({
        next: () => {
          this.chargerCamions();
          this.messageSuccess = `✅ Sortie du camion ${camion.numeroChassis} enregistrée avec succès.`;
          setTimeout(() => this.messageSuccess = '', 3000);
        },
        error: (err) => {
          console.error('Erreur lors de la sortie', err);
          this.messageErreur = `❌ Erreur lors de l'enregistrement de la sortie du camion ${camion.numeroChassis}.`;
          setTimeout(() => this.messageErreur = '', 3000);
        }
      });
    }
  }

  naviguerVersAjout(): void {
    this.router.navigate(['/agent/ajouterLivraison']);
  }

  toggleSelection(camion: Camion) {
    if (this.isSelected(camion)) {
      this.selectedCamions = this.selectedCamions.filter(c => c.numeroChassis !== camion.numeroChassis);
    } else {
      this.selectedCamions.push(camion);
    }
  }

  isSelected(camion: Camion): boolean {
    return this.selectedCamions.some(c => c.numeroChassis === camion.numeroChassis);
  }

  // Nouvelles méthodes pour la sélection en masse
  selectionnerTous() {
    this.selectedCamions = [...this.camionsFiltres];
  }

  deselectionnerTous() {
    this.selectedCamions = [];
  }

  exporterExcel(exportAll: boolean) {
    this.erreurExport = false;
    const dataToExport = exportAll ? this.camionsFiltres : this.selectedCamions;

    if (dataToExport.length === 0) {
      this.erreurExport = true;
      // Masquer automatiquement l'erreur après 5 secondes
      setTimeout(() => {
        this.erreurExport = false;
      }, 5000);
      return;
    }

    const formattedData = dataToExport.map(c => ({
      'N° Châssis': c.numeroChassis,
      'Marque': c.marque,
      'Modèle': c.modele,
      'Chauffeur': `${c.nomChauffeur} ${c.prenomChauffeur}`,
      'Destination': c.destination || 'N/A',
      'Statut': c.statut === 'ENTREE' ? 'Présent' : 'Sorti',
      'Date d\'entrée': c.dateEntreeFormatee || '',
      'Date de sortie': c.dateSortieFormatee || 'Non sorti',
      'Durée de présence': c.dateSortieFormatee ? this.calculerDureePresence(c.dateEntree, c.dateSortie) : 'En cours'
    }));

    try {
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      // Personnaliser la largeur des colonnes
      const columnWidths = [
        { wch: 15 }, // N° Châssis
        { wch: 15 }, // Marque
        { wch: 15 }, // Modèle
        { wch: 20 }, // Chauffeur
        { wch: 20 }, // Destination
        { wch: 10 }, // Statut
        { wch: 20 }, // Date d'entrée
        { wch: 20 }, // Date de sortie
        { wch: 15 }  // Durée de présence
      ];
      worksheet['!cols'] = columnWidths;

      const workbook = { 
        Sheets: { 'Camions': worksheet }, 
        SheetNames: ['Camions'] 
      };
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const fileName = exportAll
        ? `camions_complet_${new Date().toISOString().slice(0, 10)}.xlsx`
        : `camions_selection_${new Date().toISOString().slice(0, 10)}.xlsx`;

      saveAs(blob, fileName);

      // Afficher un message de succès (optionnel)
      console.log(`Export réussi: ${dataToExport.length} camion(s) exporté(s)`);
      
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      this.erreurExport = true;
      setTimeout(() => {
        this.erreurExport = false;
      }, 5000);
    }
  }

  private calculerDureePresence(dateEntree: string | undefined, dateSortie: string | undefined): string {
    if (!dateEntree || !dateSortie) return 'N/A';
    
    const entree = new Date(dateEntree);
    const sortie = new Date(dateSortie);
    const diffMs = sortie.getTime() - entree.getTime();
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}j ${diffHours}h ${diffMinutes}min`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}min`;
    } else {
      return `${diffMinutes}min`;
    }
  }

  resetFiltres() {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedCamions = [];
    this.filtreStatut = 'TOUS';
    this.triActuel = 'date_desc';
    this.appliquerFiltres();
    this.erreurExport = false;
  }

  get camionsPage(): Camion[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.camionsFiltres.slice(start, start + this.itemsPerPage);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.pages.length) {
      this.currentPage = page;
      // Scroll vers le haut lors du changement de page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  logout() {
    // Confirmer la déconnexion
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      localStorage.clear();
      sessionStorage.clear();
      this.router.navigate(['/']);
    }
  }

  private formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (e) {
      return 'Erreur de date';
    }
  }

  // Méthodes utilitaires pour l'interface
  getTotalCamions(): number {
    return this.camions.length;
  }

  getPourcentageEntres(): number {
    if (this.camions.length === 0) return 0;
    return Math.round((this.getCamionsEntres() / this.camions.length) * 100);
  }

  getPourcentageSortis(): number {
    if (this.camions.length === 0) return 0;
    return Math.round((this.getCamionsSortis() / this.camions.length) * 100);
  }

  // Méthode pour actualiser les données
  actualiserDonnees() {
    this.loading = true;
    this.chargerCamions();
  }

  // Méthode pour formater les dates d'affichage
  formaterDate(date: string): string {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',  
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Méthodes de tri rapide (raccourcis)
  trierParDateRecente() {
    this.triActuel = 'date_desc';
    this.trierCamions();
  }

  trierParMarque() {
    this.triActuel = 'marque_asc';
    this.trierCamions();
  }

  trierParChauffeur() {
    this.triActuel = 'chauffeur_asc';
    this.trierCamions();
  }

  trierParStatut() {
    this.triActuel = 'statut_asc';
    this.trierCamions();
  }

  // Méthodes de filtrage rapide
  afficherSeulementPresents() {
    this.filtreStatut = 'ENTREE';
    this.appliquerFiltres();
  }

  afficherSeulementSortis() {
    this.filtreStatut = 'SORTIE';
    this.appliquerFiltres();
  }

  afficherTous() {
    this.filtreStatut = 'TOUS';
    this.appliquerFiltres();
  }

  // Méthode pour obtenir les camions par période
  getCamionsParPeriode(jours: number): Camion[] {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - jours);
    
    return this.camions.filter(c => {
      if (!c.dateEntree) return false;
      const dateEntree = new Date(c.dateEntree);
      return dateEntree >= dateLimit;
    });
  }

  // Méthodes pour les statistiques avancées
  getCamionsAujourdhui(): number {
    return this.getCamionsParPeriode(1).length;
  }

  getCamionsCetteSemaine(): number {
    return this.getCamionsParPeriode(7).length;
  }

  getCamionsCeMois(): number {
    return this.getCamionsParPeriode(30).length;
  }

  // Méthode pour obtenir la durée moyenne de présence
  getDureeMoyennePresence(): string {
    const camionsSortis = this.camions.filter(c => c.dateSortie && c.dateEntree);
    
    if (camionsSortis.length === 0) return 'N/A';
    
    let totalMs = 0;
    camionsSortis.forEach(c => {
      const entree = new Date(c.dateEntree!);
      const sortie = new Date(c.dateSortie!);
      totalMs += sortie.getTime() - entree.getTime();
    });
    
    const moyenneMs = totalMs / camionsSortis.length;
    const moyenneHeures = Math.floor(moyenneMs / (1000 * 60 * 60));
    const moyenneMinutes = Math.floor((moyenneMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${moyenneHeures}h ${moyenneMinutes}min`;
  }

  // Méthode pour rechercher par critères multiples
  rechercheAvancee(criteres: {
    chassis?: string;
    marque?: string;
    chauffeur?: string;
    destination?: string;
    statut?: 'ENTREE' | 'SORTIE';
    dateDebut?: string;
    dateFin?: string;
  }) {
    let resultats = [...this.camions];
    
    if (criteres.chassis) {
      resultats = resultats.filter(c => 
        c.numeroChassis.toLowerCase().includes(criteres.chassis!.toLowerCase())
      );
    }
    
    if (criteres.marque) {
      resultats = resultats.filter(c => 
        c.marque.toLowerCase().includes(criteres.marque!.toLowerCase())
      );
    }
    
    if (criteres.chauffeur) {
      const terme = criteres.chauffeur.toLowerCase();
      resultats = resultats.filter(c => 
        c.nomChauffeur.toLowerCase().includes(terme) ||
        c.prenomChauffeur.toLowerCase().includes(terme)
      );
    }
    
    if (criteres.destination) {
      resultats = resultats.filter(c => 
        c.destination?.toLowerCase().includes(criteres.destination!.toLowerCase())
      );
    }
    
    if (criteres.statut) {
      resultats = resultats.filter(c => c.statut === criteres.statut);
    }
    
    if (criteres.dateDebut || criteres.dateFin) {
      const debut = criteres.dateDebut ? new Date(criteres.dateDebut) : new Date(0);
      const fin = criteres.dateFin ? new Date(criteres.dateFin) : new Date();
      
      resultats = resultats.filter(c => {
        if (!c.dateEntree) return false;
        const dateEntree = new Date(c.dateEntree);
        return dateEntree >= debut && dateEntree <= fin;
      });
    }
    
    return resultats;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.relative');
    
    // Fermer le menu utilisateur si on clique en dehors
    if (!clickedInside && this.menuOuvert) {
      this.menuOuvert = false;
    }
  }

  // Méthode pour fermer automatiquement les messages d'erreur
  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    if (this.modalePasswordVisible) {
      this.fermerModalePassword();
    }
    if (this.menuOuvert) {
      this.menuOuvert = false;
    }
  }

  // Méthodes pour les raccourcis clavier
  @HostListener('window:keydown.control.f', ['$event'])
  onSearchShortcut(event: KeyboardEvent) {
    event.preventDefault();
    // Focus sur la barre de recherche
    const searchInput = document.querySelector('input[placeholder*="Rechercher"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  }

  @HostListener('window:keydown.control.r', ['$event'])
  onRefreshShortcut(event: KeyboardEvent) {
    event.preventDefault();
    this.actualiserDonnees();
  }

  @HostListener('window:keydown.control.a', ['$event'])
  onSelectAllShortcut(event: KeyboardEvent) {
    event.preventDefault();
    this.selectionnerTous();
  }
}