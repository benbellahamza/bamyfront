import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Router } from '@angular/router';

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
  filtreDestination: 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE' | null = null;
  loading: boolean = false;

  // ✅ PAGINATION MODIFIÉE POUR 12 CARTES
  currentPage: number = 1;
  itemsPerPage: number = 12; // ✅ CHANGÉ DE 16 À 12

  // ✅ GESTION DES ERREURS
  erreurExport: boolean = false;

  // ✅ UTILITAIRES
  Math = Math;

  // ✅ SUBSCRIPTIONS
  private subscriptions: any[] = [];

  // ✅ COULEURS AVATAR PRÉDÉFINIES
  private avatarColors = [
    'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
    'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)',
    'linear-gradient(135deg, #059669 0%, #047857 100%)',
    'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
    'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
    'linear-gradient(135deg, #be123c 0%, #9f1239 100%)',
    'linear-gradient(135deg, #a21caf 0%, #86198f 100%)',
    'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)'
  ];

  constructor(
    private http: HttpClient, 
    private router: Router
  ) {}

  ngOnInit(): void {
    this.chargerCamions();
    this.initAnimations();
  }

  /**
   * ✅ Initialise les animations d'entrée
   */
  private initAnimations(): void {
    setTimeout(() => {
      const elements = document.querySelectorAll('.stats-card, .truck-card');
      elements.forEach((el, index) => {
        setTimeout(() => {
          el.classList.add('fade-in');
        }, index * 100);
      });
    }, 100);
  }

  // ✅ CALLBACK LAYOUT UNIFIÉ
  onPasswordChanged(): void {
    console.log('✅ Mot de passe utilisateur changé depuis le layout unifié');
  }

  // ✅ CHARGEMENT DES DONNÉES
  chargerCamions(): void {
    this.loading = true;
    console.log('🔄 Chargement des camions...');
    
    const subscription = this.http.get<any[]>('http://localhost:8085/api/livraison/all').subscribe({
      next: (data) => {
        console.log('✅ Données reçues du serveur:', data);
        
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

            // ✅ LOGIQUE DE DESTINATION
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
        
        console.log('✅ Camions chargés :', this.camions.length);
        this.initAnimations();
        this.afficherNotificationSucces(`${this.camions.length} camions chargés avec succès`);
      },
      error: (err) => {
        console.error('❌ Erreur chargement camions :', err);
        this.loading = false;
        this.afficherNotificationErreur('Erreur lors du chargement des camions');
      }
    });
    this.subscriptions.push(subscription);
  }

  // ✅ NOUVELLE MÉTHODE DE FILTRAGE PAR DESTINATION
  filtrerParDestination(destination: 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE'): void {
    console.log('🎯 Filtrage par destination :', destination);
    
    if (this.filtreDestination === destination) {
      // Si on clique sur le même filtre, on le désactive
      this.filtreDestination = null;
      console.log('❌ Filtre destination désactivé');
    } else {
      this.filtreDestination = destination;
      console.log('✅ Filtre destination activé :', destination);
    }
    
    this.currentPage = 1;
    this.appliquerTousFiltres();
    
    const destinationLabels = {
      'PARK': 'Park',
      'LIVRAISON_FINALE': 'Livraison finale',
      'PRESTATION_EXTERIEURE': 'Prestation extérieure'
    };
    
    if (this.filtreDestination) {
      this.afficherNotificationSucces(`Filtre appliqué : ${destinationLabels[this.filtreDestination]}`);
    } else {
      this.afficherNotificationSucces('Filtre destination supprimé');
    }
  }

  // ✅ RECHERCHE AMÉLIORÉE
  rechercher(): void {
    this.currentPage = 1;
    const terme = this.searchTerm.toLowerCase().trim();
    
    console.log('🔍 Recherche avec terme :', terme);
    this.appliquerTousFiltres();
  }

  // ✅ FILTRAGE PAR DATE
  filtrerParDate(): void {
    this.currentPage = 1;
    console.log('📅 Filtrage par date :', this.startDate, '->', this.endDate);
    this.appliquerTousFiltres();
  }

  // ✅ MÉTHODE UNIFIÉE POUR APPLIQUER TOUS LES FILTRES
  private appliquerTousFiltres(): void {
    let resultat = [...this.camions];

    // Filtrage par terme de recherche
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

    // Filtrage par destination
    if (this.filtreDestination) {
      resultat = resultat.filter(c => 
        c.statut === 'SORTIE' && c.typeDestination === this.filtreDestination
      );
    }

    // Filtrage par date
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);

      resultat = resultat.filter(c => {
        const dateEntree = new Date(c.dateEntree || '');
        return dateEntree >= start && dateEntree <= end;
      });
    }

    this.camionsFiltres = resultat;
    console.log('✅ Résultats après application de tous les filtres :', this.camionsFiltres.length);
  }

  // ✅ GESTION SÉLECTION
  toggleSelection(camion: Camion): void {
    if (this.isSelected(camion)) {
      this.selectedCamions = this.selectedCamions.filter(c => c.id !== camion.id);
      console.log('➖ Camion désélectionné :', camion.marque, camion.modele);
    } else {
      this.selectedCamions.push(camion);
      console.log('➕ Camion sélectionné :', camion.marque, camion.modele);
    }
    console.log('📊 Total sélectionnés :', this.selectedCamions.length);
  }

  isSelected(camion: Camion): boolean {
    return this.selectedCamions.some(c => c.id === camion.id);
  }

  selectionnerTous(): void {
    this.selectedCamions = [...this.camionsFiltres];
    console.log('✅ Tous les camions sélectionnés :', this.selectedCamions.length);
    this.afficherNotificationSucces(`${this.selectedCamions.length} camions sélectionnés`);
  }

  deselectionnerTous(): void {
    const count = this.selectedCamions.length;
    this.selectedCamions = [];
    console.log('❌ Tous les camions désélectionnés');
    if (count > 0) {
      this.afficherNotificationSucces('Sélection effacée');
    }
  }

  // ✅ STATISTIQUES POUR LES NOUVELLES CARTES
  getCamionsByDestination(destination: 'PARK' | 'LIVRAISON_FINALE' | 'PRESTATION_EXTERIEURE'): Camion[] {
    return this.camions.filter(c => 
      c.statut === 'SORTIE' && c.typeDestination === destination
    );
  }

  // ✅ EXPORT EXCEL
  exporterExcel(exportSelected: boolean): void {
    this.erreurExport = false;
    const dataToExport = exportSelected ? this.selectedCamions : this.camionsFiltres;

    console.log('📤 Export Excel :', exportSelected ? 'Sélectionnés' : 'Tous', '- Nombre :', dataToExport.length);

    if (dataToExport.length === 0) {
      this.erreurExport = true;
      this.afficherNotificationErreur('Aucune donnée à exporter');
      setTimeout(() => {
        this.erreurExport = false;
      }, 5000);
      return;
    }

    this.exporterDonnees(dataToExport, exportSelected ? 'selection' : 'tous');
  }

  // ✅ MÉTHODE UNIFIÉE D'EXPORT
  private exporterDonnees(data: Camion[], type: 'tous' | 'selection'): void {
    const formattedData = data.map(c => ({
      'N° Châssis': c.numeroChassis,
      'Marque': c.marque,
      'Modèle': c.modele,
      'Chauffeur Entrée': this.formatNomComplet(c.nomChauffeur, c.prenomChauffeur),
      'Date Entrée': c.dateEntreeFormatee || 'Non définie',
      'Date Sortie': c.dateSortieFormatee || 'Non sorti',
      'Statut': c.statut === 'ENTREE' ? 'Présent' : 'Sorti',
      'Type Destination': c.typeDestination ? this.getDestinationLabel(c.typeDestination) : 'Non défini',
      'Destination': c.destination || 'Non définie',
      'Chauffeur Livraison': this.formatNomComplet(c.nomChauffeurLivraison, c.prenomChauffeurLivraison),
      'CIN Chauffeur': c.cinChauffeurLivraison || 'Non défini',
      'Entreprise': c.nomEntreprise || 'Non définie',
      'Durée de présence': this.calculerDureePresence(c)
    }));

    try {
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      // Configuration des largeurs de colonnes
      const columnWidths = [
        { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 20 },
        { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 25 },
        { wch: 15 }, { wch: 25 }, { wch: 15 }
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
      
      const typeLabel = type === 'tous' ? 'tous' : 'selection';
      const fileName = `camions_${typeLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(blob, fileName);

      console.log('✅ Export Excel réussi :', fileName);
      const message = type === 'tous' 
        ? `Export réussi : ${data.length} camions exportés` 
        : `Export de la sélection réussi : ${data.length} camions exportés`;
      this.afficherNotificationSucces(message);

    } catch (error) {
      console.error('❌ Erreur export Excel :', error);
      this.erreurExport = true;
      this.afficherNotificationErreur('Erreur lors de l\'export Excel');
      setTimeout(() => {
        this.erreurExport = false;
      }, 5000);
    }
  }

  /**
   * ✅ UTILITAIRES POUR L'EXPORT
   */
  private formatNomComplet(nom?: string, prenom?: string): string {
    if (!nom && !prenom) return 'Non défini';
    return `${nom || ''}${prenom ? ' ' + prenom : ''}`.trim();
  }

  /**
   * ✅ Calcule la durée de présence
   */
  private calculerDureePresence(camion: Camion): string {
    if (!camion.dateEntree) return 'Non définie';
    
    const entree = new Date(camion.dateEntree);
    const sortie = camion.dateSortie ? new Date(camion.dateSortie) : new Date();
    
    const dureeMs = sortie.getTime() - entree.getTime();
    const heures = Math.floor(dureeMs / (1000 * 60 * 60));
    const minutes = Math.floor((dureeMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (heures > 0) {
      return `${heures}h ${minutes}min`;
    } else {
      return `${minutes}min`;
    }
  }

  // ✅ MÉTHODES UTILITAIRES
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

  // ✅ FORMATAGE DES DATES
  private formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('❌ Erreur formatage date:', e);
      return 'Erreur';
    }
  }

  // ✅ RÉINITIALISATION AMÉLIORÉE
  resetFiltres(): void {
    console.log('🔄 Réinitialisation des filtres...');
    
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.filtreDestination = null; // ✅ NOUVEAU : Reset du filtre destination
    this.selectedCamions = [];
    this.camionsFiltres = [...this.camions];
    this.currentPage = 1;
    this.erreurExport = false;
    
    console.log('✅ Filtres réinitialisés');
    this.afficherNotificationSucces('Filtres réinitialisés');
  }

  // ✅ ACTUALISATION DES DONNÉES
  actualiserDonnees(): void {
    console.log('🔄 Actualisation des données...');
    this.resetFiltres();
    this.chargerCamions();
  }

  // ✅ PAGINATION AMÉLIORÉE POUR 12 CARTES
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
      console.log('📄 Changement de page :', page);
      
      // Scroll vers le haut du contenu
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.scrollTop = 0;
      }
    }
  }

  // ✅ FILTRES PRÉDÉFINIS AMÉLIORÉS
  filtrerParPeriodePredefinie(periode: 'aujourdhui' | 'hier' | 'semaine' | 'mois'): void {
    console.log('📅 Filtre prédéfini :', periode);
    
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
    this.appliquerTousFiltres();
    
    const periodeLabels = {
      'aujourdhui': 'aujourd\'hui',
      'hier': 'hier',
      'semaine': 'les 7 derniers jours',
      'mois': 'les 30 derniers jours'
    };
    
    this.afficherNotificationSucces(`Filtre appliqué : ${periodeLabels[periode]}`);
  }

  // ✅ OPTIMISATION PERFORMANCE
  trackByCamion(index: number, camion: Camion): any {
    return camion.id || camion.numeroChassis;
  }

  /**
   * ✅ MÉTHODES UTILITAIRES POUR L'INTERFACE
   */

  /**
   * Retourne une couleur d'avatar basée sur l'ID du camion
   */
  getAvatarColor(camion: Camion): string {
    const index = (camion.id || 0) % this.avatarColors.length;
    return this.avatarColors[index];
  }

  /**
   * Retourne les initiales d'un camion
   */
  getCamionInitials(camion: Camion): string {
    if (!camion || !camion.marque || !camion.modele) return '??';
    return (camion.marque[0] + camion.modele[0]).toUpperCase();
  }

  /**
   * Retourne la couleur du badge selon le statut
   */
  getBadgeStatutClass(camion: Camion): string {
    return camion.dateSortie 
      ? 'bg-emerald-100 text-emerald-800' 
      : 'bg-amber-100 text-amber-800';
  }

  /**
   * Formate une date pour l'affichage
   */
  formatDateDisplay(date: string | Date): string {
    if (!date) return 'Date inconnue';
    
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('❌ Erreur formatage date :', error);
      return 'Date invalide';
    }
  }

  /**
   * ✅ MÉTHODES DE NOTIFICATION AMÉLIORÉES
   */

  /**
   * Affiche une notification de succès
   */
  private afficherNotificationSucces(message: string): void {
    console.log('✅ SUCCESS:', message);
    this.creerNotificationToast(message, 'success');
  }

  /**
   * Affiche une notification d'erreur
   */
  private afficherNotificationErreur(message: string): void {
    console.error('❌ ERROR:', message);
    this.creerNotificationToast(message, 'error');
  }

  /**
   * Crée une notification toast personnalisée et moderne
   */
  private creerNotificationToast(message: string, type: 'success' | 'error'): void {
    const toast = document.createElement('div');
    toast.className = `fixed top-24 right-6 z-[9999] px-6 py-4 rounded-xl shadow-2xl transform translate-x-full transition-all duration-500 max-w-md ${
      type === 'success' 
        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
        : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
    }`;
    
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${type === 'success' 
              ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>'
              : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'
            }
          </svg>
        </div>
        <span class="font-medium text-sm">${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white/80 hover:text-white">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animation d'entrée
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Animation de sortie et suppression automatique
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 500);
    }, 4000);
  }

  /**
   * ✅ MÉTHODES SUPPLÉMENTAIRES
   */

  /**
   * Rafraîchit toutes les données
   */
  rafraichirDonnees(): void {
    console.log('🔄 Rafraîchissement des données...');
    this.chargerCamions();
  }

  /**
   * Exporte les statistiques générales
   */
  exporterStatistiques(): void {
    console.log('📊 Export des statistiques...');
    
    const stats = {
      'Total camions': this.camions.length,
      'Prestations extérieures': this.getCamionsByDestination('PRESTATION_EXTERIEURE').length,
      'Livraisons finales': this.getCamionsByDestination('LIVRAISON_FINALE').length,
      'Camions au park': this.getCamionsByDestination('PARK').length,
      'Date export': new Date().toLocaleString('fr-FR')
    };

    const worksheet = XLSX.utils.json_to_sheet([stats]);
    const workbook = { Sheets: { 'Statistiques': worksheet }, SheetNames: ['Statistiques'] };
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const fileName = `statistiques_camions_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(blob, fileName);
    
    this.afficherNotificationSucces('Statistiques exportées');
  }

  /**
   * ✅ GETTERS POUR L'INTERFACE
   */
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

  /**
   * ✅ MÉTHODES DE SAUVEGARDE D'ÉTAT
   */
  private sauvegarderEtat(): void {
    const etat = {
      currentPage: this.currentPage,
      itemsPerPage: this.itemsPerPage,
      searchTerm: this.searchTerm,
      startDate: this.startDate,
      endDate: this.endDate,
      filtreDestination: this.filtreDestination,
      selectedCamions: this.selectedCamions.map(c => c.id),
      timestamp: Date.now()
    };
    
    try {
      sessionStorage.setItem('admin_livraison_etat', JSON.stringify(etat));
      console.log('💾 État interface sauvegardé');
    } catch (e) {
      console.warn('⚠️ Impossible de sauvegarder l\'état');
    }
  }

  private restaurerEtat(): void {
    try {
      const etatStr = sessionStorage.getItem('admin_livraison_etat');
      if (!etatStr) return;
      
      const etat = JSON.parse(etatStr);
      
      // Vérifier que l'état n'est pas trop ancien (1 heure max)
      if (Date.now() - etat.timestamp > 60 * 60 * 1000) {
        sessionStorage.removeItem('admin_livraison_etat');
        return;
      }
      
      this.currentPage = etat.currentPage || 1;
      this.itemsPerPage = etat.itemsPerPage || 12;
      this.searchTerm = etat.searchTerm || '';
      this.startDate = etat.startDate || '';
      this.endDate = etat.endDate || '';
      this.filtreDestination = etat.filtreDestination || null;
      
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
      sessionStorage.removeItem('admin_livraison_etat');
    }
  }

  /**
   * ✅ Cleanup lors de la destruction du composant
   */
  ngOnDestroy(): void {
    // Sauvegarder l'état avant destruction
    this.sauvegarderEtat();
    
    // Nettoyer les subscriptions
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    
    // Nettoyer les notifications toast restantes
    const toasts = document.querySelectorAll('[class*="fixed top-24 right-6"]');
    toasts.forEach(toast => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    });
    
    console.log('🧹 Nettoyage du composant admin livraison');
  }
}