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
  nomChauffeurLivraison?: string;
  prenomChauffeurLivraison?: string;
  cinChauffeurLivraison?: string;
  nomEntreprise?: string;
  
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
  loading: boolean = false;

  // ✅ PAGINATION
  currentPage: number = 1;
  itemsPerPage: number = 16;

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

  // ✅ CHARGEMENT DES DONNÉES
  chargerCamions(): void {
    this.loading = true;
    const subscription = this.http.get<Camion[]>('http://localhost:8085/api/livraison/all').subscribe({
      next: (data) => {
        if (!data || !Array.isArray(data)) {
          this.camions = [];
          this.camionsFiltres = [];
          this.loading = false;
          return;
        }
        
        this.camions = data
          .filter(camion => camion && camion.marque && camion.modele && camion.numeroChassis)
          .map(camion => {
            const nomChauffeur = camion.chauffeurEntree?.nom || camion.nomChauffeur || '';
            const prenomChauffeur = camion.chauffeurEntree?.prenom || camion.prenomChauffeur || '';

            return {
              ...camion,
              nomChauffeur,
              prenomChauffeur,
              statut: (camion.dateSortie ? 'SORTIE' : 'ENTREE') as 'ENTREE' | 'SORTIE',
              dateEntreeFormatee: this.formatDate(camion.dateEntree),
              dateSortieFormatee: camion.dateSortie ? this.formatDate(camion.dateSortie) : ''
            };
          })
          .sort((a, b) => new Date(b.dateEntree || '').getTime() - new Date(a.dateEntree || '').getTime());
        
        this.camionsFiltres = [...this.camions];
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement camions', err);
        this.camions = [];
        this.camionsFiltres = [];
        this.loading = false;
      }
    });
    this.subscriptions.push(subscription);
  }

  // ✅ RECHERCHE ET FILTRAGE
  rechercher(): void {
    this.currentPage = 1;
    this.appliquerFiltres();
  }

  filtrerParDate(): void {
    this.currentPage = 1;
    this.appliquerFiltres();
  }

  filtrerParStatut(statut: 'TOUS' | 'ENTREE' | 'SORTIE'): void {
    this.filtreStatut = statut;
    this.currentPage = 1;
    this.appliquerFiltres();
  }

  private appliquerFiltres(): void {
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
  }

  // ✅ MÉTHODES UTILITAIRES
  getCamionsByStatut(statut: 'ENTREE' | 'SORTIE'): Camion[] {
    return this.camions.filter(c => c.statut === statut);
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

  // ✅ GESTION SÉLECTION
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

  // ✅ EXPORT EXCEL
  exporterExcel(exportAll: boolean): void {
    const dataToExport = exportAll ? this.camionsFiltres : this.selectedCamions;

    if (dataToExport.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const formattedData = dataToExport.map(c => ({
      'N° Châssis': c.numeroChassis,
      'Marque': c.marque,
      'Modèle': c.modele,
      'Nom Chauffeur (Entrée)': c.nomChauffeur,
      'Prénom Chauffeur (Entrée)': c.prenomChauffeur,
      'Date Entrée': c.dateEntreeFormatee || '',
      'Type Camion': c.typeCamion || 'En attente',
      'Destination': c.destination || 'En attente',
      'Nom Chauffeur Livraison': c.nomChauffeurLivraison || 'En attente',
      'Prénom Chauffeur Livraison': c.prenomChauffeurLivraison || 'En attente',
      'CIN Chauffeur Livraison': c.cinChauffeurLivraison || 'En attente',
      'Nom Entreprise': c.nomEntreprise || 'En attente',
      'Date Sortie': c.dateSortieFormatee || 'Non sorti',
      'Statut': c.statut === 'ENTREE' ? 'Présent' : 'Sorti'
    }));

    try {
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      const columnWidths = [
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
        { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
        { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 12 }
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

      const fileName = `camions_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(blob, fileName);
      
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    }
  }

  // ✅ RÉINITIALISATION
  resetFiltres(): void {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedCamions = [];
    this.filtreStatut = 'TOUS';
    this.currentPage = 1;
    
    this.camionsFiltres = this.camions.filter(camion => 
      camion && camion.marque && camion.modele && camion.numeroChassis
    );
  }

  // ✅ PAGINATION
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
    const end = start + this.itemsPerPage;
    
    const camionsFiltresValides = this.camionsFiltres.filter(camion => 
      camion && 
      camion.marque && 
      camion.modele && 
      camion.numeroChassis
    );
    
    return camionsFiltresValides.slice(start, end);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.pages.length) {
      this.currentPage = page;
    }
  }

  // ✅ OPTIMISATION PERFORMANCE
  trackByCamion(index: number, camion: Camion): any {
    if (!camion) {
      return index;
    }
    return camion.id || camion.numeroChassis || index;
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