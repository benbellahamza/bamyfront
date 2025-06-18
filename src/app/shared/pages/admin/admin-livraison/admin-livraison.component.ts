import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface Camion {
  id?: number;
  numeroChassis: string;
  marque: string;
  modele: string;
  
  // Chauffeur d'entrée
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
  
  // Données de sortie
  dateSortie?: string;
  dateSortieFormatee?: string;
  typeCamion?: string;
  destination?: string;
  typeDestination?: 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE';
  nomChauffeurLivraison?: string;
  prenomChauffeurLivraison?: string;
  cinChauffeurLivraison?: string;
  nomEntreprise?: string;
  
  // Livraison object from backend
  livraison?: {
    destination: string;
    nomChauffeurSortie: string;
    prenomChauffeurSortie: string;
    cinChauffeurSortie: string;
    entreprise: string;
    dateSortie: string;
  };
  
  // Statut calculé
  statut?: 'ENTREE' | 'SORTIE';
}

@Component({
  selector: 'app-admin-livraison',
  standalone: false,
  templateUrl: './admin-livraison.component.html',
  styleUrls: ['./admin-livraison.component.css']
})
export class AdminLivraisonComponent implements OnInit, OnDestroy {
  
  // ✅ CONFIGURATION NAVIGATION
  navigationItems = [
    {
      label: 'Tableau de bord',
      route: '/admin/dashboard',
      icon: 'dashboard',
      active: false
    },
    {
      label: 'Historique des actions',
      route: '/admin/historique',
      icon: 'history',
      active: false
    },
    {
      label: 'Gestion des visiteurs',
      route: '/admin/visiteur',
      icon: 'users',
      active: false
    },
    {
      label: 'Gestion des livraisons',
      route: '/admin/livraison',
      icon: 'truck',
      active: true
    }
  ];

  // ✅ DONNÉES PRINCIPALES
  camions: Camion[] = [];
  camionsFiltres: Camion[] = [];
  selectedCamions: Camion[] = [];

  // ✅ FILTRES ET RECHERCHE
  searchTerm: string = '';
  startDate: string = '';
  endDate: string = '';
  filtreStatut: 'TOUS' | 'ENTREE' | 'SORTIE' = 'TOUS';
  filtreDestination: 'TOUS' | 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE' = 'TOUS';
  showDestinationFilter: boolean = false;
  loading: boolean = false;

  // ✅ PAGINATION
  currentPage: number = 1;
  itemsPerPage: number = 16;
  itemsPerPageOptions: number[] = [8, 16, 24, 32, 48]; // ✅ AJOUTÉ

  // ✅ GESTION DES ERREURS
  erreurExport: boolean = false;

  // ✅ UTILITAIRES
  Math = Math;

  // ✅ SUBSCRIPTIONS
  private subscriptions: any[] = [];

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.chargerCamions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
  }

  // ✅ CALLBACK LAYOUT UNIFIÉ
  onPasswordChanged(): void {
    console.log('Mot de passe changé');
  }

  // ✅ CHARGEMENT DES DONNÉES - SIMPLIFIÉ STYLE VISITEUR
  chargerCamions(): void {
    this.loading = true;
    const subscription = this.http.get<any[]>('http://localhost:8085/api/livraison/all').subscribe({
      next: (data) => {
        if (!data || !Array.isArray(data)) {
          this.camions = [];
          this.camionsFiltres = [];
          this.loading = false;
          return;
        }
        
        this.camions = data
          .filter(camion => camion && camion.marque && camion.modele && camion.numeroChassis)
          .map((camion) => {
            const nomChauffeur = camion.chauffeurEntree?.nom || camion.nomChauffeur || '';
            const prenomChauffeur = camion.chauffeurEntree?.prenom || camion.prenomChauffeur || '';

            // ✅ LOGIQUE SIMPLIFIÉE DE DESTINATION
            let typeDestination: 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE' = 'PARK';
            let nomChauffeurLivraison = '';
            let prenomChauffeurLivraison = '';
            let cinChauffeurLivraison = '';
            let nomEntreprise = '';
            let destination = '';
            
            // Si le camion est sorti ET qu'il y a des données de livraison
            if (camion.dateSortie && camion.livraison) {
              destination = camion.livraison.destination || '';
              nomChauffeurLivraison = camion.livraison.nomChauffeurSortie || '';
              prenomChauffeurLivraison = camion.livraison.prenomChauffeurSortie || '';
              cinChauffeurLivraison = camion.livraison.cinChauffeurSortie || '';
              nomEntreprise = camion.livraison.entreprise || '';
              
              // Détermination du type de destination
              if (destination.toLowerCase().includes('park')) {
                typeDestination = 'PARK';
              } else if (destination.toLowerCase().includes('livraison') || nomEntreprise) {
                typeDestination = 'LIVRAISON_FINALE';
              } else if (destination.toLowerCase().includes('prestation') || (nomChauffeurLivraison && !nomEntreprise)) {
                typeDestination = 'PRESTATION_EXTERIEURE';
              }
            }

            return {
              ...camion,
              nomChauffeur,
              prenomChauffeur,
              statut: (camion.dateSortie ? 'SORTIE' : 'ENTREE') as 'ENTREE' | 'SORTIE',
              dateEntreeFormatee: this.formatDate(camion.dateEntree),
              dateSortieFormatee: camion.dateSortie ? this.formatDate(camion.dateSortie) : '',
              destination,
              typeDestination,
              nomChauffeurLivraison,
              prenomChauffeurLivraison,
              cinChauffeurLivraison,
              nomEntreprise
            };
          })
          .sort((a, b) => new Date(b.dateEntree || '').getTime() - new Date(a.dateEntree || '').getTime());
        
        this.camionsFiltres = [...this.camions];
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement camions', err);
        this.camions = [];
        this.camionsFiltres = [];
        this.loading = false;
      }
    });
    this.subscriptions.push(subscription);
  }

  // ✅ RECHERCHE - STYLE VISITEUR
  rechercher(): void {
    this.currentPage = 1;
    const terme = this.searchTerm.toLowerCase().trim();
    
    if (!terme) {
      this.appliquerTousFiltres();
      return;
    }

    this.camionsFiltres = this.camions.filter(c =>
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

    this.appliquerFiltresDate();
  }

  // ✅ FILTRAGE PAR DATE - STYLE VISITEUR
  filtrerParDate(): void {
    this.currentPage = 1;
    this.appliquerFiltresDate();
  }

  private appliquerFiltresDate(): void {
    if (!this.startDate || !this.endDate) {
      if (this.searchTerm) {
        this.rechercher();
      } else {
        this.camionsFiltres = [...this.camions];
      }
      return;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    end.setHours(23, 59, 59, 999);

    const listeBase = this.searchTerm ? this.camionsFiltres : this.camions;
    
    this.camionsFiltres = listeBase.filter(c => {
      if (!c.dateEntree) return false;
      const dateEntree = new Date(c.dateEntree);
      return dateEntree >= start && dateEntree <= end;
    });
  }

  private appliquerTousFiltres(): void {
    let resultat = [...this.camions];

    if (this.searchTerm) {
      const terme = this.searchTerm.toLowerCase().trim();
      resultat = resultat.filter(c =>
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

    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);

      resultat = resultat.filter(c => {
        if (!c.dateEntree) return false;
        const dateEntree = new Date(c.dateEntree);
        return dateEntree >= start && dateEntree <= end;
      });
    }

    this.camionsFiltres = resultat;
  }

  // ✅ GESTION SÉLECTION - STYLE VISITEUR
  toggleSelection(camion: Camion): void {
    if (this.isSelected(camion)) {
      this.selectedCamions = this.selectedCamions.filter(c => c.id !== camion.id);
    } else {
      this.selectedCamions.push(camion);
    }
  }

  isSelected(camion: Camion): boolean {
    return this.selectedCamions.some(c => c.id === camion.id);
  }

  selectionnerTous(): void {
    this.selectedCamions = [...this.camionsFiltres];
  }

  deselectionnerTous(): void {
    this.selectedCamions = [];
  }

  // ✅ MÉTHODES UTILITAIRES
  getCamionsByStatut(statut: 'ENTREE' | 'SORTIE'): Camion[] {
    return this.camions.filter(c => c.statut === statut);
  }

  getCamionsByDestination(destination: 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE'): Camion[] {
    return this.camions.filter(c => 
      c.statut === 'SORTIE' && c.typeDestination === destination
    );
  }

  getCamionsPresents(): number {
    return this.getCamionsByStatut('ENTREE').length;
  }

  getCamionsSortis(): number {
    return this.getCamionsByStatut('SORTIE').length;
  }

  getDestinationLabel(type: 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE'): string {
    switch (type) {
      case 'PARK': return 'Park';
      case 'LIVRAISON_FINALE': return 'Livraison finale';
      case 'PRESTATION_EXTERIEURE': return 'Prestation extérieure';
      default: return 'Non défini';
    }
  }

  getDestinationIcon(type: 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE'): string {
    switch (type) {
      case 'PARK': return '🅿️';
      case 'LIVRAISON_FINALE': return '🏢';
      case 'PRESTATION_EXTERIEURE': return '🔧';
      default: return '📍';
    }
  }

  getDestinationBadgeClass(type: 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE'): string {
    switch (type) {
      case 'PARK': 
        return 'bg-cyan-100 text-cyan-800 px-2 py-1 rounded-full text-xs font-medium';
      case 'LIVRAISON_FINALE': 
        return 'bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium';
      case 'PRESTATION_EXTERIEURE': 
        return 'bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium';
      default: 
        return 'bg-slate-100 text-slate-800 px-2 py-1 rounded-full text-xs font-medium';
    }
  }

  // ✅ NOUVELLES MÉTHODES D'AFFICHAGE STYLE VISITEUR
  hasValidDestination(camion: Camion): boolean {
    return camion.statut === 'SORTIE' && 
           camion.typeDestination !== undefined && 
           camion.typeDestination !== 'PARK'; // Afficher seulement les destinations spéciales
  }

  hasLivraisonInfo(camion: Camion): boolean {
    return !!(camion.nomEntreprise || camion.nomChauffeurLivraison || camion.cinChauffeurLivraison);
  }

  private formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Erreur de date';
    }
  }

  // ✅ EXPORT EXCEL AMÉLIORÉ - AVEC GESTION SÉLECTION
  exporterExcel(exportSelected: boolean): void {
    this.erreurExport = false;
    
    // Déterminer les données à exporter
    let dataToExport: Camion[] = [];
    if (exportSelected && this.selectedCamions.length > 0) {
      dataToExport = this.selectedCamions;
    } else {
      dataToExport = this.camionsFiltres;
    }

    if (dataToExport.length === 0) {
      this.erreurExport = true;
      setTimeout(() => {
        this.erreurExport = false;
      }, 5000);
      return;
    }

    const formattedData = dataToExport.map(c => ({
      'N° Châssis': c.numeroChassis,
      'Marque': c.marque,
      'Modèle': c.modele,
      'Type Camion': c.typeCamion || '',
      'Nom Chauffeur (Entrée)': c.nomChauffeur || '',
      'Prénom Chauffeur (Entrée)': c.prenomChauffeur || '',
      'Date Entrée': c.dateEntreeFormatee || '',
      'Date Sortie': c.dateSortieFormatee || 'Non sorti',
      'Statut': c.statut === 'ENTREE' ? 'Présent' : 'Sorti',
      'Destination': c.typeDestination ? this.getDestinationLabel(c.typeDestination) : 'Non défini',
      'Nom Chauffeur Livraison': c.nomChauffeurLivraison || '',
      'Prénom Chauffeur Livraison': c.prenomChauffeurLivraison || '',
      'CIN Chauffeur Livraison': c.cinChauffeurLivraison || '',
      'Nom Entreprise': c.nomEntreprise || ''
    }));

    try {
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      const columnWidths = [
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
        { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 18 },
        { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 }
      ];
      worksheet['!cols'] = columnWidths;

      const workbook = { 
        Sheets: { 'Camions': worksheet }, 
        SheetNames: ['Camions'] 
      };
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      // Nom de fichier différent selon le type d'export
      const prefix = exportSelected ? 'camions_selection' : 'camions_export';
      const fileName = `${prefix}_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(blob, fileName);

    } catch (error) {
      console.error('Erreur export:', error);
      this.erreurExport = true;
      setTimeout(() => {
        this.erreurExport = false;
      }, 5000);
    }
  }

  // ✅ RÉINITIALISATION - STYLE VISITEUR
  resetFiltres(): void {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedCamions = [];
    this.filtreStatut = 'TOUS';
    this.filtreDestination = 'TOUS';
    this.showDestinationFilter = false;
    this.camionsFiltres = [...this.camions];
    this.currentPage = 1;
    this.erreurExport = false;
  }

  // ✅ PAGINATION AMÉLIORÉE
  changeItemsPerPage(newSize: number): void {
    this.itemsPerPage = newSize;
    this.currentPage = 1;
  }

  get pages(): number[] {
    const total = Math.ceil(this.camionsFiltres.length / this.itemsPerPage);
    return Array.from({ length: total }, (_, i) => i + 1);
  }

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

  get camionsPage(): Camion[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.camionsFiltres.slice(start, start + this.itemsPerPage);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.pages.length) {
      this.currentPage = page;
    }
  }

  // ✅ FILTRES PRÉDÉFINIS - STYLE VISITEUR
  filtrerParPeriodePredefinie(periode: 'aujourdhui' | 'hier' | 'semaine' | 'mois'): void {
    const maintenant = new Date();
    let debut: Date;
    let fin: Date = new Date(maintenant);

    switch (periode) {
      case 'aujourdhui':
        debut = new Date(maintenant);
        debut.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        break;
      case 'hier':
        debut = new Date(maintenant);
        debut.setDate(maintenant.getDate() - 1);
        debut.setHours(0, 0, 0, 0);
        fin = new Date(debut);
        fin.setHours(23, 59, 59, 999);
        break;
      case 'semaine':
        debut = new Date(maintenant);
        debut.setDate(maintenant.getDate() - 7);
        debut.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        break;
      case 'mois':
        debut = new Date(maintenant);
        debut.setDate(maintenant.getDate() - 30);
        debut.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        break;
      default:
        return;
    }

    this.startDate = debut.toISOString().split('T')[0];
    this.endDate = fin.toISOString().split('T')[0];
    this.filtrerParDate();
  }

  // ✅ OPTIMISATION PERFORMANCE - STYLE VISITEUR
  trackByCamion(index: number, camion: Camion): any {
    return camion.id || camion.numeroChassis || index;
  }

  // ✅ FILTRES SPÉCIFIQUES CAMIONS (optionnel)
  filtrerParStatut(statut: 'TOUS' | 'ENTREE' | 'SORTIE'): void {
    this.filtreStatut = statut;
    this.currentPage = 1;
    
    // Afficher/masquer le filtre de destination
    this.showDestinationFilter = statut === 'SORTIE';
    if (statut !== 'SORTIE') {
      this.filtreDestination = 'TOUS';
    }
    
    this.appliquerFiltresAvances();
  }

  filtrerParDestination(destination: 'TOUS' | 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE'): void {
    this.filtreDestination = destination;
    this.currentPage = 1;
    this.appliquerFiltresAvances();
  }

  private appliquerFiltresAvances(): void {
    let filtres = [...this.camions];

    // Filtre par statut
    if (this.filtreStatut !== 'TOUS') {
      filtres = filtres.filter(c => c.statut === this.filtreStatut);
    }

    // Filtre par destination (uniquement pour les camions sortis)
    if (this.filtreDestination !== 'TOUS' && this.filtreStatut === 'SORTIE') {
      filtres = filtres.filter(c => c.typeDestination === this.filtreDestination);
    }

    // Appliquer les autres filtres
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
  }

  // ✅ STATISTIQUES
  getTotalCamions(): number {
    return this.camions.length;
  }

  getPourcentagePresents(): number {
    if (this.camions.length === 0) return 0;
    return Math.round((this.getCamionsByStatut('ENTREE').length / this.camions.length) * 100);
  }

  getPourcentageSortis(): number {
    if (this.camions.length === 0) return 0;
    return Math.round((this.getCamionsByStatut('SORTIE').length / this.camions.length) * 100);
  }

  // ✅ ACTUALISATION
  actualiserDonnees(): void {
    this.loading = true;
    this.chargerCamions();
  }
}