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

  // ✅ PAGINATION
  currentPage: number = 1;
  itemsPerPage: number = 16;

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
    this.getVisiteurs();
    this.initAnimations();
  }



  /**
   * ✅ Initialise les animations d'entrée
   */
  private initAnimations(): void {
    // Ajouter les classes d'animation après un court délai
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
    // Ici vous pouvez ajouter une logique spécifique si nécessaire
    // Par exemple, recharger certaines données ou afficher une notification
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
        this.visiteursFiltres = [...this.visiteurs];
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

  // ✅ RECHERCHE AMÉLIORÉE
  rechercher(): void {
    this.currentPage = 1;
    const terme = this.searchTerm.toLowerCase().trim();
    
    console.log('🔍 Recherche avec terme :', terme);
    
    if (!terme) {
      this.appliquerTousFiltres();
      return;
    }

    this.visiteursFiltres = this.visiteurs.filter(v =>
      v.nom.toLowerCase().includes(terme) ||
      v.prenom.toLowerCase().includes(terme) ||
      v.cin.toLowerCase().includes(terme) ||
      v.destination.toLowerCase().includes(terme) ||
      (v.telephone && v.telephone.toLowerCase().includes(terme)) ||
      (v.typeVisiteur && v.typeVisiteur.toLowerCase().includes(terme))
    );

    this.appliquerFiltresDate();
    console.log('✅ Résultats de recherche :', this.visiteursFiltres.length);
  }

  // ✅ FILTRAGE PAR DATE AMÉLIORÉ
  filtrerParDate(): void {
    this.currentPage = 1;
    console.log('📅 Filtrage par date :', this.startDate, '->', this.endDate);
    this.appliquerFiltresDate();
  }

  private appliquerFiltresDate(): void {
    if (!this.startDate || !this.endDate) {
      if (this.searchTerm) {
        this.rechercher();
      } else {
        this.visiteursFiltres = [...this.visiteurs];
      }
      return;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    end.setHours(23, 59, 59, 999);

    const listeBase = this.searchTerm ? this.visiteursFiltres : this.visiteurs;
    
    this.visiteursFiltres = listeBase.filter(v => {
      const dateEntree = new Date(v.dateEntree);
      return dateEntree >= start && dateEntree <= end;
    });

    console.log('✅ Résultats après filtrage par date :', this.visiteursFiltres.length);
  }

  private appliquerTousFiltres(): void {
    let resultat = [...this.visiteurs];

    // Filtrage par terme de recherche
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

    // Filtrage par date
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

  // ✅ EXPORT EXCEL AMÉLIORÉ
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
      
      const fileName = `visiteurs_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(blob, fileName);

      console.log('✅ Export Excel réussi :', fileName);
      this.afficherNotificationSucces(`Export réussi : ${dataToExport.length} visiteurs exportés`);

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
    this.selectedVisiteurs = [];
    this.visiteursFiltres = [...this.visiteurs];
    this.currentPage = 1;
    this.erreurExport = false;
    
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
      const mainContent = document.querySelector('main');
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
    this.filtrerParDate();
    
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
   * ✅ Méthodes utilitaires pour l'interface
   */

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
   * ✅ Méthodes de notification
   */

  /**
   * Affiche une notification de succès
   */
  private afficherNotificationSucces(message: string): void {
    console.log('✅ SUCCESS:', message);
    
    // Vous pouvez intégrer ici un service de notification
    // Pour l'instant, on utilise une notification temporaire
    // this.notificationService.success(message);
    
    // Optionnel : notification toast personnalisée
    this.creerNotificationToast(message, 'success');
  }

  /**
   * Affiche une notification d'erreur
   */
  private afficherNotificationErreur(message: string): void {
    console.error('❌ ERROR:', message);
    
    // Vous pouvez intégrer ici un service de notification
    // this.notificationService.error(message);
    
    // Optionnel : notification toast personnalisée
    this.creerNotificationToast(message, 'error');
  }

  /**
   * Crée une notification toast personnalisée
   */
  private creerNotificationToast(message: string, type: 'success' | 'error'): void {
    // Implémentation d'une notification toast simple
    const toast = document.createElement('div');
    toast.className = `fixed top-24 right-6 z-[9999] px-6 py-4 rounded-xl shadow-2xl transform translate-x-full transition-all duration-500 ${
      type === 'success' 
        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
        : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
    }`;
    
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          ${type === 'success' 
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'
          }
        </svg>
        <span class="font-medium">${message}</span>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animation d'entrée
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Animation de sortie et suppression
    setTimeout(() => {
      toast.style.transform = 'translateX(full)';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 500);
    }, 3000);
  }

  /**
   * ✅ Méthodes de cycle de vie et nettoyage
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