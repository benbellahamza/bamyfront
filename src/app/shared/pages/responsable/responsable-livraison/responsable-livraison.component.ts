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
  selector: 'app-responsable-livraison',
  standalone: false,
  templateUrl: './responsable-livraison.component.html',
  styleUrls: ['./responsable-livraison.component.css']
})
export class ResponsableLivraisonComponent implements OnInit, OnDestroy, AfterViewInit {
  
  // ✅ CONFIGURATION NAVIGATION
  navigationItems = [
    {
      label: 'Dashboard Responsable',
      route: '/responsable/dashboard',
      icon: 'dashboard',
      active: false
    },
    {
      label: 'Liste des visiteurs',
      route: '/responsable/visiteur',
      icon: 'users',
      active: false
    },
    {
      label: 'Gestion des livraisons',
      route: '/responsable/livraison',
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
  loading: boolean = false;

  // ✅ NOUVEAUX FILTRES DE NAVIGATION AVEC ELLIPSES
  filtreNavigation: 'ENTREE' | 'SORTIE' | '' = ''; // Filtre principal : Entrée/Sortie
  filtreMarque: 'RENAULT' | 'FORLAND' | 'KAICENE' | 'TOUS' | '' = ''; // Filtre marque pour les entrées
  filtreDestinationNav: 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE' | 'TOUS' | '' = ''; // Filtre destination pour les sorties

  // ✅ PAGINATION OPTIMISÉE POUR 6 CARTES PAR LIGNE ET 12 CARTES PAR PAGE
  currentPage: number = 1;
  itemsPerPage: number = 12; // ✅ 12 cartes par page (2 lignes de 6 cartes)
  itemsPerPageOptions: number[] = [12, 24, 36, 48]; // ✅ Options optimisées pour 6 cartes par ligne

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
    console.log('🔍 ResponsableLivraisonComponent initialisé - 6 cartes par ligne, 12 par page');
  }

  ngOnInit(): void {
    console.log('🚀 Composant initialisé - 6 cartes par ligne, pagination 12 par page');
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
    
    console.log('🧹 Composant détruit avec nettoyage complet (6 cartes par ligne)');
  }

  // ✅ CALLBACK LAYOUT UNIFIÉ
  onPasswordChanged(): void {
    console.log('🔐 Mot de passe changé depuis l\'interface responsable livraison');
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

  // ✅ MÉTHODES DE NAVIGATION PAR ELLIPSES
  changerFiltreNavigation(filtre: 'ENTREE' | 'SORTIE'): void {
    console.log('🎯 Changement filtre navigation:', filtre);
    this.filtreNavigation = filtre;
    
    // Réinitialiser les sous-filtres
    this.filtreMarque = '';
    this.filtreDestinationNav = '';
    
    this.currentPage = 1;
    this.appliquerFiltresNavigation();
  }

  changerFiltreMarque(marque: 'RENAULT' | 'FORLAND' | 'KAICENE' | 'TOUS'): void {
    console.log('🎯 Changement filtre marque:', marque);
    this.filtreMarque = marque;
    this.currentPage = 1;
    this.appliquerFiltresNavigation();
  }

  changerFiltreDestinationNav(destination: 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE' | 'TOUS'): void {
    console.log('🎯 Changement filtre destination:', destination);
    this.filtreDestinationNav = destination;
    this.currentPage = 1;
    this.appliquerFiltresNavigation();
  }

  // ✅ APPLICATION DES FILTRES DE NAVIGATION
  private appliquerFiltresNavigation(): void {
    console.log('🔍 Application des filtres de navigation...');
    
    let resultat = [...this.camions];

    // ✅ FILTRE PRINCIPAL : ENTREE/SORTIE
    if (this.filtreNavigation) {
      resultat = resultat.filter(c => c.statut === this.filtreNavigation);
      console.log(`📊 Après filtre ${this.filtreNavigation}:`, resultat.length);
    }

    // ✅ SOUS-FILTRE POUR ENTREE : MARQUE
    if (this.filtreNavigation === 'ENTREE' && this.filtreMarque && this.filtreMarque !== 'TOUS') {
      resultat = resultat.filter(c => {
        const marque = c.marque.toUpperCase();
        return marque.includes(this.filtreMarque) || marque === this.filtreMarque;
      });
      console.log(`📊 Après filtre marque ${this.filtreMarque}:`, resultat.length);
    }

    // ✅ SOUS-FILTRE POUR SORTIE : DESTINATION
    if (this.filtreNavigation === 'SORTIE' && this.filtreDestinationNav && this.filtreDestinationNav !== 'TOUS') {
      resultat = resultat.filter(c => c.typeDestination === this.filtreDestinationNav);
      console.log(`📊 Après filtre destination ${this.filtreDestinationNav}:`, resultat.length);
    }

    // ✅ FILTRE DE RECHERCHE TEXTUELLE
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
      console.log(`📊 Après recherche "${terme}":`, resultat.length);
    }

    // ✅ FILTRE PAR DATE
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);

      resultat = resultat.filter(c => {
        if (!c.dateEntree) return false;
        const dateEntree = new Date(c.dateEntree);
        return dateEntree >= start && dateEntree <= end;
      });
      console.log(`📊 Après filtre date:`, resultat.length);
    }

    console.log('📊 Résultat final des filtres:', resultat.length);
    this.camionsFiltres = resultat;
    
    // ✅ RECALCULER LA PAGINATION APRÈS FILTRAGE
    this.calculerPagination();
  }

  // ✅ RECHERCHE OPTIMISÉE
  rechercher(): void {
    console.log('🔍 Recherche déclenchée:', this.searchTerm);
    this.currentPage = 1;
    this.appliquerFiltresNavigation();
  }

  // ✅ FILTRAGE PAR DATE
  filtrerParDate(): void {
    this.currentPage = 1;
    this.appliquerFiltresNavigation();
  }

  // ✅ FILTRES PRÉDÉFINIS AJOUTÉS
  filtrerParPeriodePredefinie(periode: 'aujourdhui' | 'semaine'): void {
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
      case 'semaine':
        debut = new Date(maintenant);
        debut.setDate(maintenant.getDate() - 7);
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

  // ✅ MÉTHODES DE SÉLECTION AJOUTÉES
  selectionnerTous(): void {
    this.selectedCamions = [...this.camionsPage];
    console.log('✅ Camions de la page courante sélectionnés:', this.selectedCamions.length);
  }

  deselectionnerTous(): void {
    const count = this.selectedCamions.length;
    this.selectedCamions = [];
    console.log('❌ Tous les camions désélectionnés:', count);
  }

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

  // ✅ MÉTHODES UTILITAIRES POUR LES ELLIPSES
  getCamionsByStatut(statut: 'ENTREE' | 'SORTIE'): Camion[] {
    return this.camions.filter(c => c.statut === statut);
  }

  getCamionsByDestination(destination: 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE'): Camion[] {
    return this.camions.filter(c => 
      c.statut === 'SORTIE' && c.typeDestination === destination
    );
  }

  // ✅ NOUVELLE MÉTHODE POUR FILTRER PAR MARQUE
  getCamionsByMarque(marque: 'RENAULT' | 'FORLAND' | 'KAICENE'): Camion[] {
    return this.camions.filter(c => {
      const camionMarque = c.marque.toUpperCase();
      return c.statut === 'ENTREE' && (camionMarque.includes(marque) || camionMarque === marque);
    });
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
  exporterExcel(exportSelected: boolean = false): void {
    this.erreurExport = false;
    
    // Déterminer les données à exporter
    let dataToExport: Camion[] = this.camionsFiltres;

    if (dataToExport.length === 0) {
      this.erreurExport = true;
      console.warn('⚠️ Aucune donnée à exporter');
      setTimeout(() => {
        this.erreurExport = false;
      }, 5000);
      return;
    }

    console.log('📤 Export Excel:', {
      count: dataToExport.length,
      filtres: {
        navigation: this.filtreNavigation,
        marque: this.filtreMarque,
        destination: this.filtreDestinationNav,
        recherche: this.searchTerm
      }
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
      'Export Date': new Date().toLocaleString('fr-FR'),
      'Filtres Appliqués': `Nav:${this.filtreNavigation || 'Tous'} | Marque:${this.filtreMarque || 'Toutes'} | Dest:${this.filtreDestinationNav || 'Toutes'}`
    }));

    try {
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      // Configuration des largeurs de colonnes optimisées
      const columnWidths = [
        { wch: 5 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 20 },
        { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 30 }
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
      
      // Nom de fichier avec filtres appliqués
      const prefix = 'camions_responsable';
      const filtres = `${this.filtreNavigation || 'tous'}_${this.filtreMarque || 'toutes-marques'}_${this.filtreDestinationNav || 'toutes-dest'}`;
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const fileName = `${prefix}_${filtres}_${timestamp}.xlsx`;
      
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
    
    console.log('📄 Pagination calculée (6 cartes par ligne, 12 par page):', {
      totalCamions: this.camionsFiltres.length,
      itemsPerPage: this.itemsPerPage,
      totalPages: totalPages,
      currentPage: this.currentPage,
      camionsVisibles: this.camionsPage.length
    });
  }

  // ✅ RÉINITIALISATION COMPLÈTE
  resetFiltres(): void {
    console.log('🔄 Réinitialisation des filtres...');
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedCamions = [];
    this.filtreNavigation = '';
    this.filtreMarque = '';
    this.filtreDestinationNav = '';
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

  // ✅ OPTIMISATION PERFORMANCE POUR CARTES COMPACTES
  trackByCamion(index: number, camion: Camion): any {
    return camion.id || camion.numeroChassis;
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

  // ✅ MÉTHODES DE RESPONSIVE DESIGN POUR 6 CARTES PAR LIGNE
  getCartesParLigne(): number {
    const width = window.innerWidth;
    
    if (width >= 1920) return 6; // Très grand écran : 6 cartes
    if (width >= 1536) return 5; // XL : 5 cartes
    if (width >= 1280) return 4; // Large : 4 cartes
    if (width >= 1024) return 3; // Medium : 3 cartes
    if (width >= 768) return 2;  // Small : 2 cartes
    return 1; // Mobile : 1 carte
  }

  ajusterItemsPerPageSelonEcran(): void {
    const cartesParLigne = this.getCartesParLigne();
    const lignesOptimales = 2; // 2 lignes par défaut
    const nouveauItemsPerPage = cartesParLigne * lignesOptimales;
    
    // S'assurer qu'on a au minimum 12 cartes par page
    const itemsPerPageAjuste = Math.max(12, nouveauItemsPerPage);
    
    if (itemsPerPageAjuste !== this.itemsPerPage) {
      console.log(`📱 Ajustement pour écran: ${cartesParLigne} cartes/ligne → ${itemsPerPageAjuste} items/page`);
      this.itemsPerPage = itemsPerPageAjuste;
      this.currentPage = 1;
      this.calculerPagination();
    }
  }

  // ✅ MÉTHODES DE GESTION D'ÉVÉNEMENTS
  onWindowResize(): void {
    // Debounce pour éviter trop d'appels
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.ajusterItemsPerPageSelonEcran();
    }, 250);
  }

  // ✅ MÉTHODES DE SAUVEGARDE D'ÉTAT
  sauvegarderEtat(): void {
    const etat = {
      currentPage: this.currentPage,
      itemsPerPage: this.itemsPerPage,
      searchTerm: this.searchTerm,
      startDate: this.startDate,
      endDate: this.endDate,
      filtreNavigation: this.filtreNavigation,
      filtreMarque: this.filtreMarque,
      filtreDestinationNav: this.filtreDestinationNav,
      timestamp: Date.now()
    };
    
    this.cacherResultat('etat_interface_responsable', etat);
    console.log('💾 État interface responsable sauvegardé');
  }

  restaurerEtat(): void {
    const etat = this.obtenirCache('etat_interface_responsable');
    if (!etat) return;
    
    try {
      this.currentPage = etat.currentPage || 1;
      this.itemsPerPage = etat.itemsPerPage || 12; // ✅ Défaut 12 cartes
      this.searchTerm = etat.searchTerm || '';
      this.startDate = etat.startDate || '';
      this.endDate = etat.endDate || '';
      this.filtreNavigation = etat.filtreNavigation || '';
      this.filtreMarque = etat.filtreMarque || '';
      this.filtreDestinationNav = etat.filtreDestinationNav || '';
      
      console.log('🔄 État interface responsable restauré');
      this.appliquerFiltresNavigation();
    } catch (e) {
      console.warn('⚠️ Erreur lors de la restauration de l\'état:', e);
    }
  }

  // ✅ MÉTHODES DE CACHE OPTIMISÉES
  private cacherResultat(key: string, data: any): void {
    try {
      const cacheKey = `camion_responsable_cache_${key}`;
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
      const cacheKey = `camion_responsable_cache_${key}`;
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

  // ✅ MÉTHODES DE GESTION D'ERREURS
  private gererErreurChargement(error: any): void {
    console.error('❌ Erreur lors du chargement:', error);
    
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
    
    if (this.itemsPerPage < 12) {
      this.itemsPerPage = 12; // ✅ Minimum 12 cartes par page
      return false;
    }
    
    if (this.itemsPerPage > 100) {
      this.itemsPerPage = 48; // ✅ Maximum 48 cartes par page
      return false;
    }
    
    return true;
  }

  // ✅ MÉTHODES DE PERFORMANCE POUR CARTES COMPACTES
  private optimiserPerformance(): void {
    // Limitation du nombre d'éléments affichés pour améliorer les performances
    if (this.camionsFiltres.length > 1000) {
      console.warn('⚠️ Grand nombre de camions, optimisation des performances recommandée');
    }
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

  // ✅ MÉTHODES FINALES POUR CONFIGURATION
  getVersionInterface(): string {
    return 'Responsable 6 Cartes par Ligne avec Ellipses v2.0';
  }

  getConfigurationActuelle(): any {
    return {
      version: this.getVersionInterface(),
      mode: '6_cartes_par_ligne_responsable_ellipses',
      pagination: {
        itemsPerPage: this.itemsPerPage,
        currentPage: this.currentPage,
        totalPages: this.pages.length
      },
      filtres: {
        navigation: this.filtreNavigation,
        marque: this.filtreMarque,
        destinationNav: this.filtreDestinationNav,
        searchTerm: this.searchTerm,
        dateRange: this.startDate && this.endDate ? `${this.startDate} - ${this.endDate}` : null
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
    console.log('📊 Configuration responsable avec ellipses:', config);
  }
}