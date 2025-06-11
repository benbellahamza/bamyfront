import { Component, OnInit } from '@angular/core';
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
  // ✅ CONFIGURATION POUR LE LAYOUT UNIFIÉ
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
      active: true  // Page actuelle
    },
    {
      label: 'Gestion des livraisons',
      route: '/admin/livraison',
      icon: 'truck',
      active: false
    }
  ];

  // 📊 DONNÉES PRINCIPALES
  visiteurs: Visiteur[] = [];
  visiteursFiltres: Visiteur[] = [];
  selectedVisiteurs: Visiteur[] = [];

  // 🔍 FILTRES ET RECHERCHE
  searchTerm: string = '';
  startDate: string = '';
  endDate: string = '';
  loading: boolean = false;

  // 🔢 PAGINATION
  currentPage: number = 1;
  itemsPerPage: number = 12; // Augmenté pour la nouvelle grille

  // ⚠️ GESTION DES ERREURS
  erreurExport: boolean = false;

  // 🛠️ UTILITAIRES
  Math = Math; // Référence Math pour l'utilisation dans le template

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.getVisiteurs();
  }

  /**
   * ✅ Callback pour le changement de mot de passe du layout unifié
   */
  onPasswordChanged(): void {
    console.log('✅ Mot de passe utilisateur changé depuis le layout unifié');
    // Ici vous pouvez ajouter une logique spécifique si nécessaire
    // Par exemple, recharger certaines données ou afficher une notification
  }

  // 📊 CHARGEMENT DES DONNÉES
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

  // 🔍 RECHERCHE ET FILTRAGE
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

  // ✅ GESTION DE LA SÉLECTION
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

  selectionnerTous() {
    this.selectedVisiteurs = [...this.visiteursFiltres];
  }

  deselectionnerTous() {
    this.selectedVisiteurs = [];
  }

  // 📊 STATISTIQUES POUR LE DASHBOARD
  getVisiteursSortis(): number {
    return this.visiteurs.filter(v => v.dateSortie).length;
  }

  getVisiteursPresents(): number {
    return this.visiteurs.filter(v => !v.dateSortie).length;
  }

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

  // 📤 EXPORT EXCEL
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

  // 🔄 RÉINITIALISATION
  resetFiltres() {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedVisiteurs = [];
    this.visiteursFiltres = [...this.visiteurs];
    this.currentPage = 1;
    this.erreurExport = false;
  }

  // 📄 GESTION DE LA PAGINATION
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

  setPage(page: number) {
    if (page >= 1 && page <= this.pages.length) {
      this.currentPage = page;
      // Scroll vers le haut lors du changement de page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // 🔄 ACTUALISATION DES DONNÉES
  actualiserDonnees() {
    this.loading = true;
    this.getVisiteurs();
  }

  // 🛠️ MÉTHODES UTILITAIRES
  formaterDate(date: string): string {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ✅ MÉTHODES SUPPLÉMENTAIRES POUR L'INTERFACE
  
  /**
   * Obtient le nom complet de l'utilisateur (pour compatibilité)
   */
  get nomComplet(): string {
    // Cette méthode peut être supprimée car l'utilisateur est géré par le layout unifié
    return 'Utilisateur Admin';
  }

  /**
   * Calcule les statistiques rapides pour l'affichage
   */
  obtenirStatistiquesRapides() {
    return {
      total: this.visiteurs.length,
      sortis: this.getVisiteursSortis(),
      presents: this.getVisiteursPresents(),
      selectionnes: this.selectedVisiteurs.length,
      pourcentageSortis: this.getPourcentageSortis(),
      pourcentagePresents: this.getPourcentagePresents()
    };
  }

  /**
   * Filtre les visiteurs par statut
   */
  filtrerParStatut(statut: 'tous' | 'presents' | 'sortis') {
    this.currentPage = 1;
    
    switch (statut) {
      case 'presents':
        this.visiteursFiltres = this.visiteurs.filter(v => !v.dateSortie);
        break;
      case 'sortis':
        this.visiteursFiltres = this.visiteurs.filter(v => v.dateSortie);
        break;
      default:
        this.visiteursFiltres = [...this.visiteurs];
        break;
    }
    
    // Appliquer les autres filtres si nécessaire
    if (this.searchTerm) {
      this.rechercher();
    }
    if (this.startDate && this.endDate) {
      this.appliquerFiltresDate();
    }
  }

  /**
   * Obtient la classe CSS pour le badge de statut
   */
  getBadgeStatutClass(visiteur: Visiteur): string {
    return visiteur.dateSortie ? 
      'bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1' : 
      'bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1';
  }

  /**
   * Obtient le texte du statut
   */
  getStatutTexte(visiteur: Visiteur): string {
    return visiteur.dateSortie ? 'Sorti' : 'Présent';
  }

  /**
   * Vérifie si un visiteur est présent depuis longtemps
   */
  estPresentDepuisLongtemps(visiteur: Visiteur): boolean {
    if (visiteur.dateSortie) return false;
    
    const maintenant = new Date();
    const entree = new Date(visiteur.dateEntree);
    const diffHeures = (maintenant.getTime() - entree.getTime()) / (1000 * 60 * 60);
    
    return diffHeures > 8; // Plus de 8 heures
  }

  /**
   * Calcule la durée de présence pour un visiteur encore présent
   */
  calculerDureePresence(dateEntree: string): string {
    const entree = new Date(dateEntree);
    const maintenant = new Date();
    const diffMs = maintenant.getTime() - entree.getTime();
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}min`;
    } else {
      return `${diffMinutes}min`;
    }
  }

  /**
   * Exporte les statistiques en PDF (fonctionnalité future)
   */
  exporterStatistiquesPDF() {
    console.log('🔄 Export PDF des statistiques (à implémenter)');
    // Implémentation future pour l'export PDF
  }

  /**
   * Recherche avancée par période prédéfinie
   */
  filtrerParPeriodePredéfinie(periode: 'aujourd\'hui' | 'hier' | 'semaine' | 'mois') {
    const maintenant = new Date();
    let debut: Date;
    let fin: Date = new Date(maintenant);

    switch (periode) {
      case 'aujourd\'hui':
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

  /**
   * Valide les données d'un visiteur
   */
  private validerVisiteur(visiteur: Visiteur): boolean {
    return !!(visiteur.nom && visiteur.prenom && visiteur.cin && visiteur.destination);
  }

  /**
   * Nettoie les données avant l'export
   */
  private nettoyerDonneesExport(visiteurs: Visiteur[]): Visiteur[] {
    return visiteurs.filter(v => this.validerVisiteur(v));
  }

  /**
   * Obtient les visiteurs avec des problèmes potentiels
   */
  getVisiteursAvecProblemes(): Visiteur[] {
    return this.visiteurs.filter(v => 
      !this.validerVisiteur(v) || this.estPresentDepuisLongtemps(v)
    );
  }

  /**
   * Recherche par type de visiteur
   */
  filtrerParType(type: string) {
    this.currentPage = 1;
    
    if (!type || type === 'tous') {
      this.appliquerTousFiltres();
      return;
    }

    this.visiteursFiltres = this.visiteurs.filter(v => 
      (v.typeVisiteur || 'Particulier').toLowerCase() === type.toLowerCase()
    );
  }

  /**
   * Obtient les types de visiteurs uniques
   */
  getTypesVisiteurs(): string[] {
    const types = this.visiteurs.map(v => v.typeVisiteur || 'Particulier');
    return [...new Set(types)].sort();
  }

  /**
   * Méthode de nettoyage lors de la destruction du composant
   */
  ngOnDestroy(): void {
    // Nettoyer les subscriptions si nécessaire
    console.log('🧹 Nettoyage du composant admin visiteur');
  }
}