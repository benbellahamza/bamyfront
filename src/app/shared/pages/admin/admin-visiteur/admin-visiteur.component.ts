import { Component, OnInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Router } from '@angular/router';

interface Visiteur {
  id: number;
  nom: string;
  prenom: string;
  cin: string;
  genre: string;
  destination: string;
  telephone?: string;
  typeVisiteur?: string;
  dateEntree: string;
  dateSortie?: string;
}

@Component({
  selector: 'app-admin-visiteur',
  standalone: false,
  templateUrl: './admin-visiteur.component.html',
  styleUrls: ['./admin-visiteur.component.css']
})
export class AdminVisiteurComponent implements OnInit {

  visiteurs: Visiteur[] = [];
  visiteursFiltres: Visiteur[] = [];
  selectedVisiteurs: Visiteur[] = [];

  searchTerm: string = '';
  startDate: string = '';
  endDate: string = '';
  loading: boolean = false;

  motDePasseVisible = false;
  confirmationVisible = false;
  confirmationMotDePasse: string = '';

  utilisateur = {
    nom: '',
    prenom: '',
    email: '',
    role: ''
  };

  menuOuvert: boolean = false;
  modalePasswordVisible = false;

  ancienMotDePasse: string = '';
  nouveauMotDePasse: string = '';
  messageSuccess: string = '';
  messageErreur: string = '';

  erreurExport: boolean = false;

  currentPage: number = 1;
  itemsPerPage: number = 12; // Augmenté pour la nouvelle grille

  // Référence Math pour l'utilisation dans le template
  Math = Math;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.recupererInfosUtilisateur();
    this.getVisiteurs();
  }

  get nomComplet(): string {
    return `${this.utilisateur.nom} ${this.utilisateur.prenom}`.trim();
  }

  recupererInfosUtilisateur() {
    const token = localStorage.getItem('access-token');
    if (!token) return;

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
    }
  }

  ouvrirModalePassword() {
    this.modalePasswordVisible = true;
    this.messageErreur = '';
    this.messageSuccess = '';
    this.menuOuvert = false; // Fermer le menu utilisateur
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
        this.messageSuccess = res.message || "Mot de passe modifié avec succès !";
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
    const total = Math.ceil(this.visiteursFiltres.length / this.itemsPerPage);
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

  getVisiteurs() {
    this.loading = true;
    this.http.get<Visiteur[]>('http://localhost:8085/api/visiteurs').subscribe({
      next: (data) => {
        this.visiteurs = data.sort((a, b) => new Date(b.dateEntree).getTime() - new Date(a.dateEntree).getTime());
        this.visiteursFiltres = [...this.visiteurs];
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des visiteurs:', err);
        this.loading = false;
      }
    });
  }

  rechercher() {
    this.currentPage = 1; // Réinitialiser à la première page lors de la recherche
    const terme = this.searchTerm.toLowerCase().trim();
    
    if (!terme) {
      this.appliquerTousFiltres();
      return;
    }

    this.visiteursFiltres = this.visiteurs.filter(v =>
      v.nom.toLowerCase().includes(terme) ||
      v.prenom.toLowerCase().includes(terme) ||
      v.cin.toLowerCase().includes(terme) ||
      v.destination.toLowerCase().includes(terme) ||
      (v.telephone && v.telephone.toLowerCase().includes(terme))
    );

    // Appliquer aussi les filtres de date si ils existent
    this.appliquerFiltresDate();
  }

  filtrerParDate() {
    this.currentPage = 1; // Réinitialiser à la première page lors du filtrage
    this.appliquerFiltresDate();
  }

  private appliquerFiltresDate() {
    if (!this.startDate || !this.endDate) {
      // Si pas de dates, appliquer seulement le filtre de recherche
      if (this.searchTerm) {
        this.rechercher();
      } else {
        this.visiteursFiltres = [...this.visiteurs];
      }
      return;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    end.setHours(23, 59, 59, 999); // Inclure toute la journée de fin

    // Partir de la liste filtrée par recherche ou de tous les visiteurs
    const listeBase = this.searchTerm ? this.visiteursFiltres : this.visiteurs;
    
    this.visiteursFiltres = listeBase.filter(v => {
      const dateEntree = new Date(v.dateEntree);
      return dateEntree >= start && dateEntree <= end;
    });
  }

  private appliquerTousFiltres() {
    let resultat = [...this.visiteurs];

    // Appliquer le filtre de recherche
    if (this.searchTerm) {
      const terme = this.searchTerm.toLowerCase().trim();
      resultat = resultat.filter(v =>
        v.nom.toLowerCase().includes(terme) ||
        v.prenom.toLowerCase().includes(terme) ||
        v.cin.toLowerCase().includes(terme) ||
        v.destination.toLowerCase().includes(terme) ||
        (v.telephone && v.telephone.toLowerCase().includes(terme))
      );
    }

    // Appliquer le filtre de date
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);

      resultat = resultat.filter(v => {
        const dateEntree = new Date(v.dateEntree);
        return dateEntree >= start && dateEntree <= end;
      });
    }

    this.visiteursFiltres = resultat;
  }

  toggleSelection(visiteur: Visiteur) {
    if (this.isSelected(visiteur)) {
      this.selectedVisiteurs = this.selectedVisiteurs.filter(v => v.id !== visiteur.id);
    } else {
      this.selectedVisiteurs.push(visiteur);
    }
  }

  isSelected(visiteur: Visiteur): boolean {
    return this.selectedVisiteurs.some(v => v.id === visiteur.id);
  }

  // Nouvelles méthodes pour la sélection en masse
  selectionnerTous() {
    this.selectedVisiteurs = [...this.visiteursFiltres];
  }

  deselectionnerTous() {
    this.selectedVisiteurs = [];
  }

  // Méthodes pour les statistiques du dashboard
  getVisiteursSortis(): number {
    return this.visiteurs.filter(v => v.dateSortie).length;
  }

  getVisiteursPresents(): number {
    return this.visiteurs.filter(v => !v.dateSortie).length;
  }

  exporterExcel(exportAll: boolean) {
    this.erreurExport = false;
    const dataToExport = exportAll ? this.visiteursFiltres : this.selectedVisiteurs;

    if (dataToExport.length === 0) {
      this.erreurExport = true;
      // Masquer automatiquement l'erreur après 5 secondes
      setTimeout(() => {
        this.erreurExport = false;
      }, 5000);
      return;
    }

    const formattedData = dataToExport.map(v => ({
      'Nom': v.nom,
      'Prénom': v.prenom,
      'CIN': v.cin,
      'Genre': v.genre,
      'Téléphone': v.telephone || 'N/A',
      'Destination': v.destination,
      'Type Visiteur': v.typeVisiteur || 'Particulier',
      'Date Entrée': v.dateEntree ? new Date(v.dateEntree).toLocaleString('fr-FR') : '',
      'Date Sortie': v.dateSortie ? new Date(v.dateSortie).toLocaleString('fr-FR') : 'Non sorti',
      'Statut': v.dateSortie ? 'Sorti' : 'Présent',
      'Durée de visite': v.dateSortie ? this.calculerDureeVisite(v.dateEntree, v.dateSortie) : 'En cours'
    }));

    try {
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      // Personnaliser la largeur des colonnes
      const columnWidths = [
        { wch: 15 }, // Nom
        { wch: 15 }, // Prénom
        { wch: 12 }, // CIN
        { wch: 10 }, // Genre
        { wch: 15 }, // Téléphone
        { wch: 20 }, // Destination
        { wch: 15 }, // Type Visiteur
        { wch: 20 }, // Date Entrée
        { wch: 20 }, // Date Sortie
        { wch: 10 }, // Statut
        { wch: 15 }  // Durée de visite
      ];
      worksheet['!cols'] = columnWidths;

      const workbook = { 
        Sheets: { 'Visiteurs': worksheet }, 
        SheetNames: ['Visiteurs'] 
      };
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const fileName = `visiteurs_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(blob, fileName);

      // Afficher un message de succès (optionnel)
      console.log(`Export réussi: ${dataToExport.length} visiteur(s) exporté(s)`);
      
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      this.erreurExport = true;
      setTimeout(() => {
        this.erreurExport = false;
      }, 5000);
    }
  }

  private calculerDureeVisite(dateEntree: string, dateSortie: string): string {
    const entree = new Date(dateEntree);
    const sortie = new Date(dateSortie);
    const diffMs = sortie.getTime() - entree.getTime();
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}min`;
    } else {
      return `${diffMinutes}min`;
    }
  }

  resetFiltres() {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedVisiteurs = [];
    this.visiteursFiltres = [...this.visiteurs];
    this.currentPage = 1;
    this.erreurExport = false;
  }

  get visiteursPage(): Visiteur[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.visiteursFiltres.slice(start, start + this.itemsPerPage);
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

  // Méthodes utilitaires pour l'interface
  getTotalVisiteurs(): number {
    return this.visiteurs.length;
  }

  getPourcentageSortis(): number {
    if (this.visiteurs.length === 0) return 0;
    return Math.round((this.getVisiteursSortis() / this.visiteurs.length) * 100);
  }

  getPourcentagePresents(): number {
    if (this.visiteurs.length === 0) return 0;
    return Math.round((this.getVisiteursPresents() / this.visiteurs.length) * 100);
  }

  // Méthode pour actualiser les données
  actualiserDonnees() {
    this.loading = true;
    this.getVisiteurs();
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
}