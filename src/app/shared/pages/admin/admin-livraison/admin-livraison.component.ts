import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
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
export class AdminLivraisonComponent implements OnInit, OnDestroy, AfterViewInit {
  
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

  // ✅ PAGINATION OPTIMISÉE POUR 5 CARTES PAR LIGNE ET 10 CARTES PAR PAGE
  currentPage: number = 1;
  itemsPerPage: number = 10; // ✅ 10 cartes par page (2 lignes de 5 cartes)
  itemsPerPageOptions: number[] = [10, 20, 30, 50]; // ✅ Options optimisées pour 5 cartes par ligne

  // ✅ GESTION DES ERREURS
  erreurExport: boolean = false;

  // ✅ UTILITAIRES
  Math = Math;

  // ✅ SUBSCRIPTIONS ET TIMEOUTS
  private subscriptions: any[] = [];
  private resizeTimeout: any;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    console.log('🔍 AdminLivraisonComponent initialisé - 5 cartes par ligne, 10 par page');
  }

  ngOnInit(): void {
    console.log('🚀 Composant initialisé - 5 cartes par ligne, pagination 10 par page');
    this.chargerCamions();
  }

  ngAfterViewInit(): void {
    // Optimiser l'affichage après rendu
    setTimeout(() => {
      this.optimiserAffichage();
      this.restaurerEtat();
    }, 100);
    
    // Écouter les changements de taille d'écran
    window.addEventListener('resize', () => this.onWindowResize());
  }

  ngOnDestroy(): void {
    // Sauvegarder l'état avant destruction
    this.sauvegarderEtat();
    
    // Nettoyer les subscriptions
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    
    // Nettoyer les event listeners
    window.removeEventListener('resize', () => this.onWindowResize());
    
    // Nettoyer les timeouts
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    console.log('🧹 Composant détruit avec nettoyage complet (5 cartes par ligne)');
  }

  // ✅ CALLBACK LAYOUT UNIFIÉ
  onPasswordChanged(): void {
    console.log('🔐 Mot de passe changé depuis l\'interface admin livraison');
  }

  // ✅ CHARGEMENT DES DONNÉES AVEC PAGINATION OPTIMISÉE
  chargerCamions(): void {
    this.loading = true;
    console.log('🔄 Chargement des camions depuis: http://localhost:8085/api/livraison/all');

    const subscription = this.http.get<any[]>('http://localhost:8085/api/livraison/all').subscribe({
      next: (data) => {
        console.log('✅ Données reçues du serveur:', data);
        console.log('📊 Nombre de camions reçus:', data?.length || 0);
        
        if (!data || !Array.isArray(data)) {
          console.warn('⚠️ Données invalides reçues');
          this.camions = [];
          this.camionsFiltres = [];
          this.loading = false;
          return;
        }
        
        this.camions = data
          .filter(camion => {
            const isValid = camion && camion.marque && camion.modele && camion.numeroChassis;
            if (!isValid) {
              console.log('❌ Camion invalide filtré:', camion);
            }
            return isValid;
          })
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
        
        console.log('✅ Camions traités:', this.camions.length);
        console.log('📋 Détail des camions:', this.camions);
        
        this.camionsFiltres = [...this.camions];
        
        // ✅ CALCULER LA PAGINATION APRÈS CHARGEMENT
        this.calculerPagination();
        
        this.loading = false;
        
        console.log('🎉 Chargement terminé avec succès');
        console.log('📄 Nombre de pages:', this.pages.length);
        console.log('📋 Camions sur cette page:', this.camionsPage.length);
      },
      error: (err) => {
        console.error('❌ Erreur chargement camions', err);
        this.gererErreurChargement(err);
      }
    });
    this.subscriptions.push(subscription);
  }

  // ✅ RECHERCHE OPTIMISÉE
  rechercher(): void {
    console.log('🔍 Recherche déclenchée:', this.searchTerm);
    this.currentPage = 1;
    this.appliquerTousFiltres();
  }

  // ✅ FILTRAGE PAR DATE
  filtrerParDate(): void {
    this.currentPage = 1;
    this.appliquerTousFiltres();
  }

  // ✅ APPLICATION DE TOUS LES FILTRES AVEC PAGINATION
  private appliquerTousFiltres(): void {
    console.log('🔍 Application des filtres...');
    console.log('📊 Camions de base:', this.camions.length);
    console.log('🔎 Terme de recherche:', this.searchTerm);
    
    let resultat = [...this.camions];

    // Filtre de recherche textuelle
    if (this.searchTerm?.trim()) {
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

    // Filtre par date
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

    console.log('📊 Camions après filtres:', resultat.length);
    this.camionsFiltres = resultat;
    
    // ✅ RECALCULER LA PAGINATION APRÈS FILTRAGE
    this.calculerPagination();
  }

  // ✅ MÉTHODE DE CALCUL DE LA PAGINATION OPTIMISÉE
  private calculerPagination(): void {
    const totalPages = Math.ceil(this.camionsFiltres.length / this.itemsPerPage);
    
    // Ajuster la page courante si nécessaire
    if (this.currentPage > totalPages && totalPages > 0) {
      this.currentPage = totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }
    
    console.log('📄 Pagination calculée (5 cartes par ligne, 10 par page):', {
      totalCamions: this.camionsFiltres.length,
      itemsPerPage: this.itemsPerPage,
      totalPages: totalPages,
      currentPage: this.currentPage,
      camionsVisibles: this.camionsPage.length
    });
  }

  // ✅ GESTION SÉLECTION AMÉLIORÉE
  toggleSelection(camion: Camion): void {
    if (this.isSelected(camion)) {
      this.selectedCamions = this.selectedCamions.filter(c => c.id !== camion.id);
      console.log('➖ Camion désélectionné:', camion.marque, camion.modele);
    } else {
      this.selectedCamions.push(camion);
      console.log('➕ Camion sélectionné:', camion.marque, camion.modele);
    }
    console.log('📋 Total sélectionnés:', this.selectedCamions.length);
  }

  isSelected(camion: Camion): boolean {
    return this.selectedCamions.some(c => c.id === camion.id);
  }

  selectionnerTous(): void {
    // ✅ SÉLECTIONNER SEULEMENT LES CAMIONS VISIBLES SUR LA PAGE COURANTE
    this.selectedCamions = [...this.camionsPage];
    console.log('✅ Camions de la page courante sélectionnés:', this.selectedCamions.length);
  }

  deselectionnerTous(): void {
    const count = this.selectedCamions.length;
    this.selectedCamions = [];
    console.log('❌ Tous les camions désélectionnés:', count);
  }

  // ✅ SÉLECTION GLOBALE (tous les camions filtrés)
  selectionnerTousGlobal(): void {
    this.selectedCamions = [...this.camionsFiltres];
    console.log('✅ Tous les camions filtrés sélectionnés:', this.selectedCamions.length);
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

  hasLivraisonInfo(camion: Camion): boolean {
    return !!(
      camion.nomEntreprise || 
      camion.nomChauffeurLivraison || 
      camion.cinChauffeurLivraison ||
      (camion.typeDestination && camion.typeDestination !== 'PARK')
    );
  }

  // ✅ FORMATAGE DES DATES AMÉLIORÉ POUR CARTES COMPACTES
  private formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      
      // Format français compact pour cartes
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit', // ✅ ANNÉE SUR 2 CHIFFRES POUR GAGNER DE L'ESPACE
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('❌ Erreur formatage date:', e);
      return 'Erreur';
    }
  }

  // ✅ FORMATAGE DATE COMPLET POUR EXPORT
  private formatDateComplete(dateStr: string | undefined): string {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      
      // Format complet pour export
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('❌ Erreur formatage date complète:', e);
      return 'Erreur de date';
    }
  }

  // ✅ EXPORT EXCEL OPTIMISÉ
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
      console.warn('⚠️ Aucune donnée à exporter');
      setTimeout(() => {
        this.erreurExport = false;
      }, 5000);
      return;
    }

    console.log('📤 Export Excel:', {
      type: exportSelected ? 'sélection' : 'tous',
      count: dataToExport.length
    });

    const formattedData = dataToExport.map((c, index) => ({
      'N°': index + 1,
      'N° Châssis': c.numeroChassis,
      'Marque': c.marque,
      'Modèle': c.modele,
      'Type Camion': c.typeCamion || '-',
      'Chauffeur Entrée': this.formatNomComplet(c.nomChauffeur, c.prenomChauffeur),
      'Date Entrée': this.formatDateComplete(c.dateEntree) || '-',
      'Date Sortie': this.formatDateComplete(c.dateSortie) || 'Non sorti',
      'Statut': c.statut === 'ENTREE' ? 'Présent' : 'Sorti',
      'Type Destination': c.typeDestination ? this.getDestinationLabel(c.typeDestination) : '-',
      'Destination': c.destination || '-',
      'Chauffeur Livraison': this.formatNomComplet(c.nomChauffeurLivraison, c.prenomChauffeurLivraison),
      'CIN Chauffeur': c.cinChauffeurLivraison || '-',
      'Entreprise': c.nomEntreprise || '-',
      'Durée Présence': this.formatDureePresence(c),
      'Export Date': new Date().toLocaleString('fr-FR')
    }));

    try {
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      // Configuration des largeurs de colonnes optimisées
      const columnWidths = [
        { wch: 5 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 20 },
        { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 20 }
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
      
      // Nom de fichier avec timestamp
      const prefix = exportSelected ? 'camions_selection' : 'camions_export';
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const fileName = `${prefix}_${timestamp}.xlsx`;
      
      saveAs(blob, fileName);
      
      console.log('✅ Export Excel réussi:', fileName);

    } catch (error) {
      console.error('❌ Erreur export Excel:', error);
      this.erreurExport = true;
      setTimeout(() => {
        this.erreurExport = false;
      }, 5000);
    }
  }

  // ✅ UTILITAIRE POUR L'EXPORT
  private formatNomComplet(nom?: string, prenom?: string): string {
    if (!nom && !prenom) return '-';
    return `${nom || ''}${prenom ? ' ' + prenom : ''}`.trim();
  }

  // ✅ RÉINITIALISATION COMPLÈTE
  resetFiltres(): void {
    console.log('🔄 Réinitialisation des filtres...');
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
    
    this.calculerPagination();
    console.log('✅ Filtres réinitialisés');
  }

  // ✅ ACTUALISATION DES DONNÉES (au lieu de reset)
  actualiserDonnees(): void {
    console.log('🔄 Actualisation des données...');
    this.resetFiltres();
    this.chargerCamions();
  }

  // ✅ PAGINATION OPTIMISÉE POUR CARTES COMPACTES
  changeItemsPerPage(newSize: number): void {
    console.log('📄 Changement items par page:', this.itemsPerPage, '→', newSize);
    this.itemsPerPage = newSize;
    this.currentPage = 1;
    this.calculerPagination();
  }

  get pages(): number[] {
    const total = Math.ceil(this.camionsFiltres.length / this.itemsPerPage);
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  getVisiblePages(): number[] {
    const totalPages = this.pages.length;
    const current = this.currentPage;
    const maxVisible = 7; // ✅ PLUS DE PAGES VISIBLES POUR CARTES COMPACTES

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
    const pageData = this.camionsFiltres.slice(start, end);
    
    console.log('📄 Camions page courante:', {
      page: this.currentPage,
      start: start + 1,
      end: Math.min(end, this.camionsFiltres.length),
      count: pageData.length,
      total: this.camionsFiltres.length
    });
    
    return pageData;
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.pages.length) {
      this.currentPage = page;
      console.log('📄 Navigation vers page:', page, 'sur', this.pages.length);
    }
  }

  // ✅ FILTRES PRÉDÉFINIS AMÉLIORÉS
  filtrerParPeriodePredefinie(periode: 'aujourdhui' | 'hier' | 'semaine' | 'mois'): void {
    console.log('📅 Filtrage par période:', periode);
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

  // ✅ OPTIMISATION PERFORMANCE POUR CARTES COMPACTES
  trackByCamion(index: number, camion: Camion): any {
    return camion.id || camion.numeroChassis;
  }

  // ✅ FILTRES AVANCÉS (optionnel)
  filtrerParStatut(statut: 'TOUS' | 'ENTREE' | 'SORTIE'): void {
    this.filtreStatut = statut;
    this.currentPage = 1;
    
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

    if (this.filtreStatut !== 'TOUS') {
      filtres = filtres.filter(c => c.statut === this.filtreStatut);
    }

    if (this.filtreDestination !== 'TOUS' && this.filtreStatut === 'SORTIE') {
      filtres = filtres.filter(c => c.typeDestination === this.filtreDestination);
    }

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
    this.calculerPagination();
  }

  // ✅ STATISTIQUES AVANCÉES
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

  getTempsPresenceMoyen(): string {
    const camionsPresents = this.getCamionsByStatut('ENTREE');
    if (camionsPresents.length === 0) return '0h';
    
    const totalHeures = camionsPresents.reduce((sum, camion) => {
      if (!camion.dateEntree) return sum;
      const diffMs = new Date().getTime() - new Date(camion.dateEntree).getTime();
      return sum + Math.floor(diffMs / (1000 * 60 * 60));
    }, 0);
    
    const moyenne = Math.floor(totalHeures / camionsPresents.length);
    return `${moyenne}h`;
  }

  getTendanceEntrees(): string {
    // Logique pour calculer la tendance des entrées
    return '+12%';
  }

  // ✅ MÉTHODES D'INFORMATION POUR CARTES COMPACTES
  getStatutCouleur(statut: 'ENTREE' | 'SORTIE'): string {
    return statut === 'ENTREE' ? 'text-green-600' : 'text-red-600';
  }

  getBadgeStatutClass(statut: 'ENTREE' | 'SORTIE'): string {
    return statut === 'ENTREE' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  }

  // ✅ GETTERS POUR L'INTERFACE
  get isFirstPage(): boolean {
    return this.currentPage === 1;
  }

  get isLastPage(): boolean {
    return this.currentPage === this.pages.length || this.pages.length === 0;
  }

  get totalPages(): number {
    return this.pages.length;
  }

  get paginationInfo(): string {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.camionsFiltres.length);
    return `${start}-${end} sur ${this.camionsFiltres.length}`;
  }

  get hasSelection(): boolean {
    return this.selectedCamions.length > 0;
  }

  // ✅ MÉTHODES DE NAVIGATION OPTIMISÉES
  goToFirstPage(): void {
    this.setPage(1);
  }

  goToLastPage(): void {
    this.setPage(this.pages.length);
  }

  goToPreviousPage(): void {
    if (!this.isFirstPage) {
      this.setPage(this.currentPage - 1);
    }
  }

  goToNextPage(): void {
    if (!this.isLastPage) {
      this.setPage(this.currentPage + 1);
    }
  }

  // ✅ NAVIGATION CLAVIER POUR CARTES COMPACTES
  onKeyboardNavigation(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' && !this.isFirstPage) {
      this.goToPreviousPage();
      event.preventDefault();
    } else if (event.key === 'ArrowRight' && !this.isLastPage) {
      this.goToNextPage();
      event.preventDefault();
    } else if (event.key === 'Home') {
      this.goToFirstPage();
      event.preventDefault();
    } else if (event.key === 'End') {
      this.goToLastPage();
      event.preventDefault();
    }
  }

  // ✅ MÉTHODES D'AFFICHAGE COMPACTES
  formatDureePresence(camion: Camion): string {
    if (!camion.dateEntree) return '-';
    
    const entree = new Date(camion.dateEntree);
    const sortie = camion.dateSortie ? new Date(camion.dateSortie) : new Date();
    
    const diffMs = sortie.getTime() - entree.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays}j ${diffHours % 24}h`;
    }
    return `${diffHours}h`;
  }

  formatDureeCompacte(camion: Camion): string {
    if (!camion.dateEntree) return '-';
    
    const entree = new Date(camion.dateEntree);
    const sortie = camion.dateSortie ? new Date(camion.dateSortie) : new Date();
    
    const diffMs = sortie.getTime() - entree.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    // Format ultra-compact pour les cartes
    if (diffDays > 0) {
      return `${diffDays}j`;
    }
    return `${diffHours}h`;
  }

  getUserInitials(camion: Camion): string {
    if (!camion.marque || !camion.modele) return '??';
    return (camion.marque[0] + camion.modele[0]).toUpperCase();
  }

  // ✅ MÉTHODES DE VALIDATION
  private validerDonneesCamion(camion: any): boolean {
    return !!(
      camion &&
      camion.marque &&
      camion.modele &&
      camion.numeroChassis &&
      camion.numeroChassis.length >= 5
    );
  }

  private validerDateFormat(dateStr: string): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  // ✅ MÉTHODES D'EXPORT AVANCÉES
  exporterPDF(): void {
    console.log('📄 Export PDF en cours de développement...');
    // Placeholder pour l'export PDF
    // Vous pouvez implémenter jsPDF ici
  }

  imprimerListe(): void {
    console.log('🖨️ Impression de la liste...');
    window.print();
  }

  // ✅ MÉTHODES DE RECHERCHE AVANCÉE
  rechercherParChassis(chassis: string): Camion | undefined {
    return this.camions.find(c => 
      c.numeroChassis.toLowerCase().includes(chassis.toLowerCase())
    );
  }

  rechercherParChauffeur(nom: string): Camion[] {
    const terme = nom.toLowerCase();
    return this.camions.filter(c =>
      (c.nomChauffeur && c.nomChauffeur.toLowerCase().includes(terme)) ||
      (c.prenomChauffeur && c.prenomChauffeur.toLowerCase().includes(terme)) ||
      (c.nomChauffeurLivraison && c.nomChauffeurLivraison.toLowerCase().includes(terme)) ||
      (c.prenomChauffeurLivraison && c.prenomChauffeurLivraison.toLowerCase().includes(terme))
    );
  }

  // ✅ MÉTHODES DE NOTIFICATION (optionnel)
  private afficherNotification(message: string, type: 'success' | 'error' | 'info'): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Ici vous pouvez intégrer un service de notification
    // Par exemple: this.notificationService.show(message, type);
  }

  private afficherSucces(message: string): void {
    this.afficherNotification(message, 'success');
  }

  private afficherErreur(message: string): void {
    this.afficherNotification(message, 'error');
  }

  private afficherInfo(message: string): void {
    this.afficherNotification(message, 'info');
  }

  // ✅ MÉTHODES DE PERFORMANCE POUR CARTES COMPACTES
  private optimiserPerformance(): void {
    // Limitation du nombre d'éléments affichés pour améliorer les performances
    if (this.camionsFiltres.length > 1000) {
      console.warn('⚠️ Grand nombre de camions, optimisation des performances recommandée');
      // Possibilité d'implémenter la virtualisation pour de très grandes listes
    }
  }

  // ✅ MÉTHODES DE CACHE OPTIMISÉES
  private cacherResultat(key: string, data: any): void {
    try {
      const cacheKey = `camion_compact_cache_${key}`;
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now(),
        itemsPerPage: this.itemsPerPage
      }));
    } catch (e) {
      console.warn('⚠️ Impossible de cacher les données');
    }
  }

  private obtenirCache(key: string): any {
    try {
      const cacheKey = `camion_compact_cache_${key}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;
      
      // Cache valide pendant 5 minutes
      if (age > 5 * 60 * 1000) {
        sessionStorage.removeItem(cacheKey);
        return null;
      }
      
      return parsed.data;
    } catch (e) {
      return null;
    }
  }

  // ✅ MÉTHODES DE NETTOYAGE AMÉLIORÉES
  private nettoyerCache(): void {
    try {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('camion_') && key.includes('_cache_')) {
          sessionStorage.removeItem(key);
        }
      });
      console.log('🧹 Cache nettoyé');
    } catch (e) {
      console.warn('⚠️ Impossible de nettoyer le cache');
    }
  }

  // ✅ MÉTHODES DE DÉVELOPPEMENT/DEBUG OPTIMISÉES
  private logPerformance(operation: string, startTime: number): void {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (duration > 100) { // Log seulement les opérations lentes
      console.warn(`⏱️ ${operation} lent : ${duration.toFixed(2)}ms`);
    } else {
      console.log(`⏱️ ${operation} : ${duration.toFixed(2)}ms`);
    }
  }

  private obtenirInfoSysteme(): any {
    return {
      userAgent: navigator.userAgent,
      langue: navigator.language,
      memoire: (performance as any).memory,
      connexion: (navigator as any).connection,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      pixelRatio: window.devicePixelRatio
    };
  }

  // ✅ MÉTHODES UTILITAIRES OPTIMISÉES
  private genererId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private formatTaille(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  private debounce(func: Function, wait: number): Function {
    let timeout: any;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // ✅ MÉTHODES DE RESPONSIVE DESIGN POUR 5 CARTES PAR LIGNE
  getCartesParLigne(): number {
    const width = window.innerWidth;
    
    if (width >= 1536) return 5; // XL et plus : 5 cartes
    if (width >= 1280) return 4; // Large : 4 cartes
    if (width >= 1024) return 3; // Medium : 3 cartes
    if (width >= 768) return 2;  // Small : 2 cartes
    return 1; // Mobile : 1 carte
  }

  ajusterItemsPerPageSelonEcran(): void {
    const cartesParLigne = this.getCartesParLigne();
    const lignesOptimales = 2; // 2 lignes par défaut pour avoir 10 cartes
    const nouveauItemsPerPage = cartesParLigne * lignesOptimales;
    
    // S'assurer qu'on a au minimum 10 cartes par page
    const itemsPerPageAjuste = Math.max(10, nouveauItemsPerPage);
    
    if (itemsPerPageAjuste !== this.itemsPerPage) {
      console.log(`📱 Ajustement pour écran: ${cartesParLigne} cartes/ligne → ${itemsPerPageAjuste} items/page`);
      this.itemsPerPage = itemsPerPageAjuste;
      this.currentPage = 1;
      this.calculerPagination();
    }
  }

  // ✅ MÉTHODES DE DIAGNOSTIC SYSTÈME AMÉLIORÉES
  diagnostiquerSysteme(): void {
    console.log('🔧 DIAGNOSTIC SYSTÈME - 5 CARTES PAR LIGNE');
    console.log('==========================================');
    console.log('Mode: 5 cartes par ligne, 10 par page');
    console.log('Camions chargés:', this.camions.length);
    console.log('Camions filtrés:', this.camionsFiltres.length);
    console.log('Page courante:', this.currentPage);
    console.log('Items par page:', this.itemsPerPage);
    console.log('Total pages:', this.pages.length);
    console.log('Camions visibles:', this.camionsPage.length);
    console.log('Camions sélectionnés:', this.selectedCamions.length);
    console.log('Cartes par ligne:', this.getCartesParLigne());
    console.log('Recherche active:', this.searchTerm || 'Aucune');
    console.log('Filtre date:', this.startDate && this.endDate ? `${this.startDate} → ${this.endDate}` : 'Aucun');
    console.log('Performance viewport:', {
      largeur: window.innerWidth,
      hauteur: window.innerHeight,
      ratio: window.devicePixelRatio
    });
    console.log('Navigateur:', this.obtenirInfoSysteme());
    console.log('===========================================');
  }

  // ✅ MÉTHODES DE GESTION D'ÉVÉNEMENTS
  onWindowResize(): void {
    // Debounce pour éviter trop d'appels
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.ajusterItemsPerPageSelonEcran();
    }, 250);
  }

  // ✅ MÉTHODES DE STATISTIQUES AVANCÉES POUR CARTES
  getStatistiquesCartes(): any {
    return {
      totalCamions: this.camions.length,
      camionsFiltres: this.camionsFiltres.length,
      camionsVisibles: this.camionsPage.length,
      camionsSelectionnes: this.selectedCamions.length,
      tauxFiltrage: this.camions.length > 0 ? Math.round((this.camionsFiltres.length / this.camions.length) * 100) : 0,
      tauxSelection: this.camionsFiltres.length > 0 ? Math.round((this.selectedCamions.length / this.camionsFiltres.length) * 100) : 0,
      cartesParPage: this.itemsPerPage,
      cartesParLigne: this.getCartesParLigne(),
      pagesTotal: this.pages.length,
      pageActuelle: this.currentPage
    };
  }

  // ✅ MÉTHODES D'ACCESSIBILITÉ POUR CARTES COMPACTES
  annoncerChangementPage(): void {
    const stats = this.getStatistiquesCartes();
    const message = `Page ${stats.pageActuelle} sur ${stats.pagesTotal}, ${stats.camionsVisibles} camions affichés`;
    
    // Annoncer aux lecteurs d'écran
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.volume = 0.1;
      speechSynthesis.speak(utterance);
    }
    
    console.log('📢 Annonce accessibilité:', message);
  }

  // ✅ MÉTHODES DE SAUVEGARDE D'ÉTAT
  sauvegarderEtat(): void {
    const etat = {
      currentPage: this.currentPage,
      itemsPerPage: this.itemsPerPage,
      searchTerm: this.searchTerm,
      startDate: this.startDate,
      endDate: this.endDate,
      filtreStatut: this.filtreStatut,
      filtreDestination: this.filtreDestination,
      selectedCamions: this.selectedCamions.map(c => c.id),
      timestamp: Date.now()
    };
    
    this.cacherResultat('etat_interface', etat);
    console.log('💾 État interface sauvegardé');
  }

  restaurerEtat(): void {
    const etat = this.obtenirCache('etat_interface');
    if (!etat) return;
    
    try {
      this.currentPage = etat.currentPage || 1;
      this.itemsPerPage = etat.itemsPerPage || 10; // ✅ Défaut 10 cartes
      this.searchTerm = etat.searchTerm || '';
      this.startDate = etat.startDate || '';
      this.endDate = etat.endDate || '';
      this.filtreStatut = etat.filtreStatut || 'TOUS';
      this.filtreDestination = etat.filtreDestination || 'TOUS';
      
      // Restaurer la sélection
      if (etat.selectedCamions && Array.isArray(etat.selectedCamions)) {
        this.selectedCamions = this.camions.filter(c => 
          etat.selectedCamions.includes(c.id)
        );
      }
      
      console.log('🔄 État interface restauré');
      this.appliquerTousFiltres();
    } catch (e) {
      console.warn('⚠️ Erreur lors de la restauration de l\'état:', e);
    }
  }

  // ✅ MÉTHODES DE GESTION D'ERREURS
  private gererErreurChargement(error: any): void {
    console.error('❌ Erreur lors du chargement:', error);
    
    // Afficher un message d'erreur à l'utilisateur
    this.afficherErreur('Erreur lors du chargement des données. Veuillez actualiser la page.');
    
    // Réinitialiser l'état
    this.loading = false;
    this.camions = [];
    this.camionsFiltres = [];
    
    // Optionnel: retry automatique après délai
    setTimeout(() => {
      if (this.camions.length === 0) {
        console.log('🔄 Tentative de rechargement automatique...');
        this.chargerCamions();
      }
    }, 5000);
  }

  // ✅ MÉTHODES DE VALIDATION D'INTERFACE
  private validerEtatInterface(): boolean {
    // Vérifier la cohérence de l'état
    if (this.currentPage < 1) {
      this.currentPage = 1;
      return false;
    }
    
    if (this.currentPage > this.pages.length && this.pages.length > 0) {
      this.currentPage = this.pages.length;
      return false;
    }
    
    if (this.itemsPerPage < 10) {
      this.itemsPerPage = 10; // ✅ Minimum 10 cartes par page
      return false;
    }
    
    if (this.itemsPerPage > 100) {
      this.itemsPerPage = 50; // ✅ Maximum 50 cartes par page
      return false;
    }
    
    return true;
  }

  // ✅ MÉTHODES D'OPTIMISATION FINALE
  private optimiserAffichage(): void {
    // Optimiser selon la taille de l'écran
    this.ajusterItemsPerPageSelonEcran();
    
    // Valider l'état
    if (!this.validerEtatInterface()) {
      this.calculerPagination();
    }
    
    // Optimiser les performances si nécessaire
    this.optimiserPerformance();
  }

  // ✅ MÉTHODES UTILITAIRES FINALES
  getVersionInterface(): string {
    return '5 Cartes par Ligne v1.0';
  }

  getConfigurationActuelle(): any {
    return {
      version: this.getVersionInterface(),
      mode: '5_cartes_par_ligne',
      pagination: {
        itemsPerPage: this.itemsPerPage,
        currentPage: this.currentPage,
        totalPages: this.pages.length
      },
      filtres: {
        searchTerm: this.searchTerm,
        dateRange: this.startDate && this.endDate ? `${this.startDate} - ${this.endDate}` : null,
        statut: this.filtreStatut,
        destination: this.filtreDestination
      },
      selection: {
        count: this.selectedCamions.length,
        percentage: this.camionsFiltres.length > 0 ? Math.round((this.selectedCamions.length / this.camionsFiltres.length) * 100) : 0
      },
      performance: {
        totalCamions: this.camions.length,
        camionsFiltres: this.camionsFiltres.length,
        cartesParLigne: this.getCartesParLigne(),
        viewport: `${window.innerWidth}x${window.innerHeight}`
      }
    };
  }

  // ✅ MÉTHODE D'INFORMATION SYSTÈME FINALE
  afficherInfoSysteme(): void {
    const config = this.getConfigurationActuelle();
    console.table(config);
    console.log('📊 Configuration actuelle:', config);
  }
}