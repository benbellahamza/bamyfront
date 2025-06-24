import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class AdminVisiteurComponent implements OnInit, OnDestroy {
  
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
      active: true
    },
    {
      label: 'Gestion des livraisons',
      route: '/admin/livraison',
      icon: 'truck',
      active: false
    }
  ];

  // ✅ DONNÉES PRINCIPALES
  visiteurs: Visiteur[] = [];
  visiteursFiltres: Visiteur[] = [];
  selectedVisiteurs: Visiteur[] = [];

  // ✅ FILTRES ET RECHERCHE
  searchTerm: string = '';
  startDate: string = '';
  endDate: string = '';
  loading: boolean = false;

  // ✅ NOUVEAU: FILTRE PAR STATUT
  filtreStatut: 'tous' | 'presents' | 'sortis' = 'tous';

  // ✅ PAGINATION - MODIFIÉ POUR 10 ÉLÉMENTS
  currentPage: number = 1;
  itemsPerPage: number = 12;

  // ✅ GESTION DES ERREURS
  erreurExport: boolean = false;

  // ✅ UTILITAIRES
  Math = Math;

  // ✅ SUBSCRIPTIONS
  private subscriptions: any[] = [];

  // ✅ COULEURS AVATAR PRÉDÉFINIES
  private avatarColors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #ff8a80 0%, #ea6100 100%)',
    'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)'
  ];

  constructor(
    private http: HttpClient, 
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getVisiteurs();
    this.initAnimations();
  }

  /**
   * ✅ Initialise les animations d'entrée
   */
  private initAnimations(): void {
    setTimeout(() => {
      const elements = document.querySelectorAll('.stats-card, .visitor-card');
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
  getVisiteurs(): void {
    this.loading = true;
    console.log('🔄 Chargement des visiteurs...');
    
    const subscription = this.http.get<Visiteur[]>('http://localhost:8085/api/visiteurs').subscribe({
      next: (data) => {
        this.visiteurs = data.sort((a, b) => 
          new Date(b.dateEntree).getTime() - new Date(a.dateEntree).getTime()
        );
        this.appliquerTousFiltres();
        this.loading = false;
        
        console.log('✅ Visiteurs chargés :', this.visiteurs.length);
        this.initAnimations();
        this.afficherNotificationSucces(`${this.visiteurs.length} visiteurs chargés avec succès`);
      },
      error: (err) => {
        console.error('❌ Erreur chargement visiteurs :', err);
        this.loading = false;
        this.afficherNotificationErreur('Erreur lors du chargement des visiteurs');
      }
    });
    this.subscriptions.push(subscription);
  }

  // ✅ NOUVEAU: FILTRAGE PAR STATUT
  filtrerParStatut(statut: 'tous' | 'presents' | 'sortis'): void {
    console.log('👥 Filtrage par statut :', statut);
    this.filtreStatut = statut;
    this.currentPage = 1;
    this.appliquerTousFiltres();
    
    const messages = {
      'tous': 'Tous les visiteurs affichés',
      'presents': 'Visiteurs présents affichés',
      'sortis': 'Visiteurs sortis affichés'
    };
    this.afficherNotificationSucces(messages[statut]);
  }

  // ✅ RECHERCHE AMÉLIORÉE
  rechercher(): void {
    this.currentPage = 1;
    console.log('🔍 Recherche avec terme :', this.searchTerm);
    this.appliquerTousFiltres();
  }

  // ✅ FILTRAGE PAR DATE AMÉLIORÉ
  filtrerParDate(): void {
    this.currentPage = 1;
    console.log('📅 Filtrage par date :', this.startDate, '->', this.endDate);
    this.appliquerTousFiltres();
  }

  // ✅ MÉTHODE UNIFIÉE POUR APPLIQUER TOUS LES FILTRES
  private appliquerTousFiltres(): void {
    let resultat = [...this.visiteurs];

    // 1. Filtrage par statut
    if (this.filtreStatut === 'presents') {
      resultat = resultat.filter(v => !v.dateSortie);
    } else if (this.filtreStatut === 'sortis') {
      resultat = resultat.filter(v => v.dateSortie);
    }

    // 2. Filtrage par terme de recherche
    if (this.searchTerm) {
      const terme = this.searchTerm.toLowerCase().trim();
      resultat = resultat.filter(v =>
        v.nom.toLowerCase().includes(terme) ||
        v.prenom.toLowerCase().includes(terme) ||
        v.cin.toLowerCase().includes(terme) ||
        v.destination.toLowerCase().includes(terme) ||
        (v.telephone && v.telephone.toLowerCase().includes(terme)) ||
        (v.typeVisiteur && v.typeVisiteur.toLowerCase().includes(terme))
      );
    }

    // 3. Filtrage par date
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
    console.log('✅ Résultats après filtrage :', this.visiteursFiltres.length);
  }

  // ✅ GESTION SÉLECTION AMÉLIORÉE
  toggleSelection(visiteur: Visiteur): void {
    if (this.isSelected(visiteur)) {
      this.selectedVisiteurs = this.selectedVisiteurs.filter(v => v.id !== visiteur.id);
      console.log('➖ Visiteur désélectionné :', visiteur.nom, visiteur.prenom);
    } else {
      this.selectedVisiteurs.push(visiteur);
      console.log('➕ Visiteur sélectionné :', visiteur.nom, visiteur.prenom);
    }
    console.log('📊 Total sélectionnés :', this.selectedVisiteurs.length);
  }

  isSelected(visiteur: Visiteur): boolean {
    return this.selectedVisiteurs.some(v => v.id === visiteur.id);
  }

  selectionnerTous(): void {
    this.selectedVisiteurs = [...this.visiteursFiltres];
    console.log('✅ Tous les visiteurs sélectionnés :', this.selectedVisiteurs.length);
    this.afficherNotificationSucces(`${this.selectedVisiteurs.length} visiteurs sélectionnés`);
  }

  deselectionnerTous(): void {
    const count = this.selectedVisiteurs.length;
    this.selectedVisiteurs = [];
    console.log('❌ Tous les visiteurs désélectionnés');
    if (count > 0) {
      this.afficherNotificationSucces('Sélection effacée');
    }
  }

  // ✅ STATISTIQUES AMÉLIORÉES
  getVisiteursSortis(): number {
    return this.visiteurs.filter(v => v.dateSortie).length;
  }

  getVisiteursPresents(): number {
    return this.visiteurs.filter(v => !v.dateSortie).length;
  }

  // ✅ EXPORT EXCEL AMÉLIORÉ - TOUT
  exporterExcel(exportAll: boolean): void {
    this.erreurExport = false;
    const dataToExport = exportAll ? this.visiteursFiltres : this.selectedVisiteurs;

    console.log('📤 Export Excel :', exportAll ? 'Tous' : 'Sélectionnés', '- Nombre :', dataToExport.length);

    if (dataToExport.length === 0) {
      this.erreurExport = true;
      this.afficherNotificationErreur('Aucune donnée à exporter');
      setTimeout(() => {
        this.erreurExport = false;
      }, 5000);
      return;
    }

    this.exporterDonnees(dataToExport, exportAll ? 'tous' : 'selection');
  }

  // ✅ NOUVEAU: EXPORT SÉLECTIONNÉS UNIQUEMENT
  exporterSelectionnes(): void {
    if (this.selectedVisiteurs.length === 0) {
      this.afficherNotificationErreur('Aucun visiteur sélectionné à exporter');
      return;
    }

    console.log('📤 Export des visiteurs sélectionnés :', this.selectedVisiteurs.length);
    this.exporterDonnees(this.selectedVisiteurs, 'selection');
  }

  // ✅ MÉTHODE UNIFIÉE D'EXPORT
  private exporterDonnees(data: Visiteur[], type: 'tous' | 'selection'): void {
    const formattedData = data.map(v => ({
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
      'Durée de visite': this.calculerDureeVisite(v)
    }));

    try {
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      // Configuration des largeurs de colonnes
      const columnWidths = [
        { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 },
        { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 15 }
      ];
      worksheet['!cols'] = columnWidths;

      const workbook = { 
        Sheets: { 'Visiteurs': worksheet }, 
        SheetNames: ['Visiteurs'] 
      };
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const typeLabel = type === 'tous' ? 'tous' : 'selection';
      const fileName = `visiteurs_${typeLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(blob, fileName);

      console.log('✅ Export Excel réussi :', fileName);
      const message = type === 'tous' 
        ? `Export réussi : ${data.length} visiteurs exportés` 
        : `Export de la sélection réussi : ${data.length} visiteurs exportés`;
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
   * ✅ Calcule la durée de visite
   */
  private calculerDureeVisite(visiteur: Visiteur): string {
    if (!visiteur.dateEntree) return 'N/A';
    
    const entree = new Date(visiteur.dateEntree);
    const sortie = visiteur.dateSortie ? new Date(visiteur.dateSortie) : new Date();
    
    const dureeMs = sortie.getTime() - entree.getTime();
    const heures = Math.floor(dureeMs / (1000 * 60 * 60));
    const minutes = Math.floor((dureeMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (heures > 0) {
      return `${heures}h ${minutes}min`;
    } else {
      return `${minutes}min`;
    }
  }

  // ✅ RÉINITIALISATION AMÉLIORÉE
  resetFiltres(): void {
    console.log('🔄 Réinitialisation des filtres...');
    
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.filtreStatut = 'tous';
    this.selectedVisiteurs = [];
    this.currentPage = 1;
    this.erreurExport = false;
    
    this.appliquerTousFiltres();
    console.log('✅ Filtres réinitialisés');
    this.afficherNotificationSucces('Filtres réinitialisés');
  }

  // ✅ PAGINATION AMÉLIORÉE
  get pages(): number[] {
    const total = Math.ceil(this.visiteursFiltres.length / this.itemsPerPage);
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

  get visiteursPage(): Visiteur[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.visiteursFiltres.slice(start, start + this.itemsPerPage);
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
  trackByVisiteurId(index: number, visiteur: Visiteur): number {
    return visiteur.id;
  }

  /**
   * ✅ NOUVELLES MÉTHODES UTILITAIRES POUR L'INTERFACE
   */

  /**
   * Retourne une couleur d'avatar basée sur l'ID du visiteur
   */
  getAvatarColor(visiteur: Visiteur): string {
    const index = visiteur.id % this.avatarColors.length;
    return this.avatarColors[index];
  }

  /**
   * Retourne les initiales d'un visiteur
   */
  getVisiteurInitials(visiteur: Visiteur): string {
    if (!visiteur || !visiteur.nom || !visiteur.prenom) return '??';
    return (visiteur.nom[0] + visiteur.prenom[0]).toUpperCase();
  }

  /**
   * Retourne la couleur du badge selon le statut
   */
  getBadgeStatutClass(visiteur: Visiteur): string {
    return visiteur.dateSortie 
      ? 'bg-emerald-100 text-emerald-800' 
      : 'bg-amber-100 text-amber-800';
  }

  /**
   * Formate une date pour l'affichage
   */
  formatDate(date: string | Date): string {
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
    this.getVisiteurs();
  }

  /**
   * Exporte les statistiques générales
   */
  exporterStatistiques(): void {
    console.log('📊 Export des statistiques...');
    
    const stats = {
      'Total visiteurs': this.visiteurs.length,
      'Visiteurs sortis': this.getVisiteursSortis(),
      'Visiteurs présents': this.getVisiteursPresents(),
      'Taux de sortie': `${((this.getVisiteursSortis() / this.visiteurs.length) * 100).toFixed(1)}%`,
      'Date export': new Date().toLocaleString('fr-FR')
    };

    const worksheet = XLSX.utils.json_to_sheet([stats]);
    const workbook = { Sheets: { 'Statistiques': worksheet }, SheetNames: ['Statistiques'] };
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const fileName = `statistiques_visiteurs_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(blob, fileName);
    
    this.afficherNotificationSucces('Statistiques exportées');
  }

  /**
   * ✅ Cleanup lors de la destruction du composant
   */
  ngOnDestroy(): void {
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
    
    console.log('🧹 Nettoyage du composant admin visiteur');
  }
}