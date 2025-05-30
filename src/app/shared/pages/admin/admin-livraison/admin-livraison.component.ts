import { Component, OnInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface Camion {
  id?: number;
  // DONNÉES D'ENTRÉE (saisies par l'agent) - OBLIGATOIRES
  numeroChassis: string;
  marque: string;
  modele: string;
  
  // CHAUFFEUR D'ENTRÉE - Structure correcte
  chauffeurEntree?: {
    id: number;
    nom: string;
    prenom?: string;
  };
  
  // Pour la rétrocompatibilité
  nomChauffeur?: string;
  prenomChauffeur?: string;
  
  dateEntree?: string;
  dateEntreeFormatee?: string;
  
  // DONNÉES DE SORTIE (saisies par l'agent lors de la sortie) - OPTIONNELLES
  dateSortie?: string;
  dateSortieFormatee?: string;
  typeCamion?: string;
  destination?: string;
  nomChauffeurLivraison?: string;
  prenomChauffeurLivraison?: string;
  cinChauffeurLivraison?: string;
  nomEntreprise?: string;
  
  // STATUT CALCULÉ
  statut?: 'ENTREE' | 'SORTIE';
}

@Component({
  selector: 'app-admin-livraison',
  standalone: false,
  templateUrl: './admin-livraison.component.html',
  styleUrls: ['./admin-livraison.component.css']
})
export class AdminLivraisonComponent implements OnInit {
  // Données principales
  camions: Camion[] = [];
  camionsFiltres: Camion[] = [];
  selectedCamions: Camion[] = [];
  filtreStatut: 'TOUS' | 'ENTREE' | 'SORTIE' = 'TOUS';
  loading: boolean = false;

  // Propriétés pour la recherche et les filtres
  searchTerm: string = '';
  startDate: string = '';
  endDate: string = '';

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
  itemsPerPage: number = 20; // Augmenté pour l'admin

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
      this.messageErreur = "Veuillez remplir les deux champs.";
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
        setTimeout(() => this.fermerModalePassword(), 3000);
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

  chargerCamions(): void {
    this.loading = true;
    this.http.get<Camion[]>('http://localhost:8085/api/livraison/all').subscribe({
      next: (data) => {
        this.camions = data.map(camion => {
          // 🔧 Mapping correct des données du chauffeur
          const nomChauffeur = camion.chauffeurEntree?.nom || camion.nomChauffeur || '';
          const prenomChauffeur = camion.chauffeurEntree?.prenom || camion.prenomChauffeur || '';

          return {
            ...camion,
            // Ajouter les propriétés mappées pour la rétrocompatibilité
            nomChauffeur,
            prenomChauffeur,
            statut: (camion.dateSortie ? 'SORTIE' : 'ENTREE') as 'ENTREE' | 'SORTIE',
            dateEntreeFormatee: this.formatDate(camion.dateEntree),
            dateSortieFormatee: camion.dateSortie ? this.formatDate(camion.dateSortie) : ''
          };
        }).sort((a, b) => new Date(b.dateEntree || '').getTime() - new Date(a.dateEntree || '').getTime());
        
        console.log('Camions après mapping:', this.camions);
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
      const terme = this.searchTerm.toLowerCase();
      filtres = filtres.filter(c =>
        c.numeroChassis.toLowerCase().includes(terme) ||
        c.marque.toLowerCase().includes(terme) ||
        c.modele.toLowerCase().includes(terme) ||
        (c.nomChauffeur && c.nomChauffeur.toLowerCase().includes(terme)) ||
        (c.prenomChauffeur && c.prenomChauffeur.toLowerCase().includes(terme)) ||
        (c.nomChauffeurLivraison && c.nomChauffeurLivraison.toLowerCase().includes(terme)) ||
        (c.prenomChauffeurLivraison && c.prenomChauffeurLivraison.toLowerCase().includes(terme)) ||
        (c.destination && c.destination.toLowerCase().includes(terme)) ||
        (c.nomEntreprise && c.nomEntreprise.toLowerCase().includes(terme))
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
    this.currentPage = 1;
  }

  appliquerFiltre(): void {
    if (this.filtreStatut === 'TOUS') {
      this.camionsFiltres = this.camions;
    } else {
      this.camionsFiltres = this.camions.filter(c => c.statut === this.filtreStatut);
    }
  }

  filtrerParStatut(statut: 'TOUS' | 'ENTREE' | 'SORTIE'): void {
    this.filtreStatut = statut;
    this.appliquerFiltres();
  }

  rechercher(): void {
    this.appliquerFiltres();
  }

  filtrerParDate(): void {
    this.appliquerFiltres();
  }

  getCamionsByStatut(statut: 'ENTREE' | 'SORTIE'): Camion[] {
    return this.camions.filter(c => c.statut === statut);
  }

  // Méthodes désactivées pour l'admin (interface consultative)
  naviguerVersAjout(): void {
    console.log('Action non autorisée: Seul l\'agent peut ajouter des camions');
  }

  enregistrerSortie(camion: Camion): void {
    console.log('Action non autorisée: Interface consultative pour l\'admin');
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

  exporterExcel(exportAll: boolean) {
    const dataToExport = exportAll ? this.camionsFiltres : this.selectedCamions;

    if (dataToExport.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const formattedData = dataToExport.map(c => ({
      // DONNÉES D'ENTRÉE
      'N° Châssis': c.numeroChassis,
      'Marque': c.marque,
      'Modèle': c.modele,
      'Nom Chauffeur (Entrée)': c.nomChauffeur,
      'Prénom Chauffeur (Entrée)': c.prenomChauffeur,
      'Date Entrée': c.dateEntreeFormatee || '',
      
      // DONNÉES DE SORTIE
      'Type Camion': c.typeCamion || 'En attente',
      'Destination': c.destination || 'En attente',
      'Nom Chauffeur Livraison': c.nomChauffeurLivraison || 'En attente',
      'Prénom Chauffeur Livraison': c.prenomChauffeurLivraison || 'En attente',
      'CIN Chauffeur Livraison': c.cinChauffeurLivraison || 'En attente',
      'Nom Entreprise': c.nomEntreprise || 'En attente',
      'Date Sortie': c.dateSortieFormatee || 'Non sorti',
      
      // INFORMATIONS CALCULÉES
      'Statut': c.statut === 'ENTREE' ? 'Présent' : 'Sorti',
      'Durée de Présence': c.dateSortieFormatee ? this.calculerDureePresence(c.dateEntree, c.dateSortie) : 'En cours'
    }));

    try {
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      // Personnaliser la largeur des colonnes pour toutes les données
      const columnWidths = [
        { wch: 15 }, // N° Châssis
        { wch: 15 }, // Marque
        { wch: 15 }, // Modèle
        { wch: 20 }, // Nom Chauffeur (Entrée)
        { wch: 20 }, // Prénom Chauffeur (Entrée)
        { wch: 20 }, // Date Entrée
        { wch: 15 }, // Type Camion
        { wch: 20 }, // Destination
        { wch: 20 }, // Nom Chauffeur Livraison
        { wch: 20 }, // Prénom Chauffeur Livraison
        { wch: 15 }, // CIN Chauffeur Livraison
        { wch: 20 }, // Nom Entreprise
        { wch: 20 }, // Date Sortie
        { wch: 12 }, // Statut
        { wch: 18 }  // Durée de Présence
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
      
      // Afficher un message de succès
      this.messageSuccess = `✅ Export Excel généré avec succès : ${fileName}`;
      setTimeout(() => this.messageSuccess = '', 3000);
      
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      this.messageErreur = '❌ Erreur lors de la génération du fichier Excel';
      setTimeout(() => this.messageErreur = '', 3000);
    }
  }

  resetFiltres() {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedCamions = [];
    this.filtreStatut = 'TOUS';
    this.appliquerFiltres();
  }

  get camionsPage(): Camion[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.camionsFiltres.slice(start, start + this.itemsPerPage);
  }

  setPage(page: number) {
    if (page < 1 || page > this.pages.length) return;
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  logout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      localStorage.clear();
      this.router.navigate(['/']);
    }
  }

  // Méthode pour calculer la durée de présence (pour camions sortis)
  calculerDureePresence(dateEntree: string | undefined, dateSortie: string | undefined): string {
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

  // Méthode pour calculer le temps de présence actuel (pour camions encore présents)
  calculerTempsPresence(dateEntree: string | undefined): string {
    if (!dateEntree) return 'N/A';
    
    const entree = new Date(dateEntree);
    const maintenant = new Date();
    const diffMs = maintenant.getTime() - entree.getTime();
    
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

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.relative') || target.closest('.w-8.h-8.rounded-full');
    if (!clickedInside && this.menuOuvert) {
      this.menuOuvert = false;
    }
  }
}