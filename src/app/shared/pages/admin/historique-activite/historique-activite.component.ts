import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { HistoriqueService } from 'app/core/services/historique/historique.service';
import { AdminService } from 'app/core/services/admin/admin.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import * as XLSX from 'xlsx';

// 🔧 INTERFACES POUR LE TYPAGE
interface HistoriqueAction {
  id: number;
  agent: string;
  action: string;
  dateAction: string;
  typeAction?: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    duration?: number;
  };
}

interface Utilisateur {
  nom: string;
  prenom: string;
  email: string;
  role: string;
  avatar?: string;
  isActive?: boolean;
}

interface FilterState {
  text: string;
  typeAction: string;
  periode: string;
  dateDebut: string;
  dateFin: string;
}

interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-historique-activite',
  standalone: false,
  templateUrl: './historique-activite.component.html',
  styleUrls: ['./historique-activite.component.css']
})
export class HistoriqueActiviteComponent implements OnInit, OnDestroy {
  // 🔄 Gestion du cycle de vie
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

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
      active: true
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
      active: false
    }
  ];

  // 📊 DONNÉES PRINCIPALES
  historique: HistoriqueAction[] = [];
  historiqueFiltered: HistoriqueAction[] = [];
  
  // 🔍 ÉTAT DES FILTRES
  private filterState: FilterState = {
    text: '',
    typeAction: '',
    periode: '',
    dateDebut: '',
    dateFin: ''
  };

  // 📄 ÉTAT DE LA PAGINATION OPTIMISÉE
  private paginationState: PaginationState = {
    currentPage: 1,
    itemsPerPage: 25, // ✅ AUGMENTÉ DE 15 À 25 pour plus d'affichage
    totalItems: 0
  };

  // 🔄 ÉTAT DU TRI
  private sortState: SortState = {
    column: 'dateAction',
    direction: 'desc'
  };
  
  // ✅ SÉLECTION
  lignesSelectionnees = new Set<number>();
  toutSelectionner = false;
  
  // 🛠️ UTILITAIRES
  Math = Math;
  actionSelectionnee: HistoriqueAction | null = null;
  isLoading = false;
  
  // 👥 BASE DE DONNÉES DES AGENTS
  private agents: Utilisateur[] = [
    { 
      nom: 'Dupont', 
      prenom: 'Jean', 
      email: 'jean.dupont@bamytrucks.com', 
      role: 'Administrateur',
      isActive: true
    },
    { 
      nom: 'Martin', 
      prenom: 'Marie', 
      email: 'marie.martin@bamytrucks.com', 
      role: 'Agent sécurité',
      isActive: true
    },
    { 
      nom: 'Bernard', 
      prenom: 'Pierre', 
      email: 'pierre.bernard@bamytrucks.com', 
      role: 'Superviseur',
      isActive: true
    },
    { 
      nom: 'Durand', 
      prenom: 'Sophie', 
      email: 'sophie.durand@bamytrucks.com', 
      role: 'Agent accueil',
      isActive: true
    },
    { 
      nom: 'Moreau', 
      prenom: 'Paul', 
      email: 'paul.moreau@bamytrucks.com', 
      role: 'Agent sécurité',
      isActive: false
    }
  ];

  // 🎯 GETTERS ET SETTERS POUR L'ÉTAT
  get filtreTexte(): string { return this.filterState.text; }
  set filtreTexte(value: string) { 
    this.filterState.text = value;
    this.searchSubject.next(value);
  }

  get filtreTypeAction(): string { return this.filterState.typeAction; }
  set filtreTypeAction(value: string) { 
    this.filterState.typeAction = value;
    this.appliquerFiltres();
  }

  get filtrePeriode(): string { return this.filterState.periode; }
  set filtrePeriode(value: string) { 
    this.filterState.periode = value;
    this.appliquerFiltres();
  }

  get dateDebut(): string { return this.filterState.dateDebut; }
  set dateDebut(value: string) { 
    this.filterState.dateDebut = value;
    this.appliquerFiltres();
  }

  get dateFin(): string { return this.filterState.dateFin; }
  set dateFin(value: string) { 
    this.filterState.dateFin = value;
    this.appliquerFiltres();
  }

  get pageActuelle(): number { return this.paginationState.currentPage; }
  set pageActuelle(value: number) { this.paginationState.currentPage = value; }

  get nombreElementsAffichage(): number { return this.paginationState.itemsPerPage; }

  constructor(
    private historiqueService: HistoriqueService,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.setupSearchDebounce();
    
    // ✅ CALCUL AUTOMATIQUE DU NOMBRE D'ÉLÉMENTS À L'INITIALISATION
    this.paginationState.itemsPerPage = this.calculateOptimalItemsPerPage();
    
    // ✅ LOG POUR DÉBOGAGE
    console.log(`🎯 Affichage optimisé : ${this.paginationState.itemsPerPage} éléments par page`);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ CALCUL DYNAMIQUE DU NOMBRE OPTIMAL D'ÉLÉMENTS PAR PAGE
  calculateOptimalItemsPerPage(): number {
    if (typeof window === 'undefined') return 25;
    
    const windowHeight = window.innerHeight;
    const headerHeight = 64; // 4rem
    const footerHeight = 40; // 2.5rem
    const toolbarHeight = 140; // Environ 8.5rem
    const paginationHeight = 64; // 4rem
    const otherSpacing = 100; // Marges et espacements divers
    
    const availableHeight = windowHeight - headerHeight - footerHeight - toolbarHeight - paginationHeight - otherSpacing;
    const rowHeight = 48; // 3rem par ligne
    
    const optimalRows = Math.floor(availableHeight / rowHeight);
    
    // Minimum 20, maximum 50 pour les performances
    return Math.max(20, Math.min(50, optimalRows));
  }

  // ✅ AJUSTEMENT AUTOMATIQUE LORS DU REDIMENSIONNEMENT
  @HostListener('window:resize', ['$event'])
  onWindowResize(): void {
    const newItemsPerPage = this.calculateOptimalItemsPerPage();
    if (newItemsPerPage !== this.paginationState.itemsPerPage) {
      this.paginationState.itemsPerPage = newItemsPerPage;
      this.paginationState.currentPage = 1;
      // ✅ NOTIFICATION SUPPRIMÉE
    }
  }

  // 🚀 INITIALISATION
  private initializeComponent(): void {
    this.chargerHistorique();
    this.setupKeyboardShortcuts();
  }

  // 🔍 CONFIGURATION DE LA RECHERCHE AVEC DEBOUNCE
  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.appliquerFiltres();
    });
  }

  // ⌨️ RACCOURCIS CLAVIER
  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'f':
          event.preventDefault();
          this.focusSearchInput();
          break;
        case 'r':
          event.preventDefault();
          this.reinitialiserFiltres();
          break;
        case 'e':
          event.preventDefault();
          this.exporterExcelFiltre();
          break;
        case 'd':
          event.preventDefault();
          this.debugDisplayMode();
          break;
      }
    }
  }

  private setupKeyboardShortcuts(): void {
    setTimeout(() => this.focusSearchInput(), 500);
  }

  private focusSearchInput(): void {
    const searchInput = document.querySelector('input[placeholder*="Rechercher"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  /**
   * ✅ Callback pour le changement de mot de passe du layout unifié
   */
  onPasswordChanged(): void {
    console.log('✅ Mot de passe utilisateur changé depuis le layout unifié');
    this.showNotification('Mot de passe mis à jour avec succès', 'success');
  }

  // 📊 CHARGEMENT DES DONNÉES
  chargerHistorique(): void {
    this.isLoading = true;
    this.historiqueService.getHistorique()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: HistoriqueAction[]) => {
          this.historique = this.enrichirDonneesHistorique(res || []);
          this.appliquerFiltres();
          this.isLoading = false;
          this.showNotification(`${this.historique.length} actions chargées`, 'info');
        },
        error: (err) => {
          console.error('❌ Erreur chargement historique :', err);
          this.historique = [];
          this.historiqueFiltered = [];
          this.isLoading = false;
          this.showNotification('Erreur lors du chargement des données', 'error');
        }
      });
  }

  // 🔧 ENRICHISSEMENT DES DONNÉES
  private enrichirDonneesHistorique(data: HistoriqueAction[]): HistoriqueAction[] {
    return data.map(action => ({
      ...action,
      metadata: {
        userAgent: 'Mozilla/5.0 (simulated)',
        ipAddress: this.generateRandomIP(),
        duration: Math.floor(Math.random() * 5000) + 100,
        ...action.metadata
      }
    }));
  }

  private generateRandomIP(): string {
    return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  // 👤 GESTION DES INFORMATIONS AGENT
  getAgentFullName(agentString: string): string {
    if (!agentString) return 'Agent inconnu';
    
    if (agentString.includes(' ')) {
      return agentString;
    }
    
    const agent = this.findAgentByString(agentString);
    return agent ? `${agent.prenom} ${agent.nom}` : agentString;
  }

  getAgentInitials(agentString: string): string {
    const fullName = this.getAgentFullName(agentString);
    
    if (!fullName || fullName === 'Agent inconnu') return '?';
    
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return fullName.charAt(0).toUpperCase();
  }

  getAgentRole(agentString: string): string {
    if (!agentString) return 'Rôle inconnu';
    
    const agent = this.findAgentByString(agentString);
    return agent ? agent.role : 'Agent';
  }

  getAgentStatus(agentString: string): 'actif' | 'inactif' {
    const agent = this.findAgentByString(agentString);
    return agent?.isActive ? 'actif' : 'inactif';
  }

  private findAgentByString(agentString: string): Utilisateur | undefined {
    const searchStr = agentString.toLowerCase();
    return this.agents.find(a => 
      a.nom.toLowerCase() === searchStr ||
      a.prenom.toLowerCase() === searchStr ||
      a.email.toLowerCase().includes(searchStr) ||
      `${a.prenom} ${a.nom}`.toLowerCase() === searchStr
    );
  }

  // ✨ NETTOYAGE DU TEXTE D'ACTION
  getCleanActionText(actionText: string): string {
    if (!actionText) return 'Action non définie';
    
    let cleanText = actionText.trim();
    
    const prefixRegex = /^(Validation Sortie|Ajout Visiteur|Modification Visiteur|Modification)\s*:\s*/i;
    cleanText = cleanText.replace(prefixRegex, '');
    
    cleanText = cleanText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\u00C0-\u017F]/g, ' ')
      .trim();
    
    return cleanText || 'Action non définie';
  }

  // 🏷️ GESTION DES CATÉGORIES
  getCategorieAction(action: HistoriqueAction): string {
    if (!action?.action) return 'Autre';
    
    const actionText = action.action.toLowerCase();
    const categorieMap = new Map([
      ['ajout visiteur', 'Ajout Visiteur'],
      ['modification visiteur', 'Modification Visiteur'],
      ['validation sortie', 'Validation Sortie'],
      ['connexion', 'Connexion'],
      ['déconnexion', 'Déconnexion'],
      ['export', 'Export'],
      ['import', 'Import']
    ]);

    for (const [keyword, category] of categorieMap) {
      if (actionText.includes(keyword)) {
        return category;
      }
    }
    
    return 'Autre';
  }

  // 🔍 FILTRAGE OPTIMISÉ
  appliquerFiltres(): void {
    let resultats = [...this.historique];

    // Filtre par texte
    if (this.filterState.text) {
      const searchTerms = this.filterState.text.toLowerCase().split(' ').filter(term => term.length > 0);
      resultats = resultats.filter(action => {
        const searchableText = [
          this.getAgentFullName(action.agent),
          action.agent,
          this.getCleanActionText(action.action),
          this.getCategorieAction(action),
          this.getAgentRole(action.agent)
        ].join(' ').toLowerCase();

        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    // Filtre par type d'action
    if (this.filterState.typeAction) {
      resultats = resultats.filter(action => 
        this.getCategorieAction(action) === this.filterState.typeAction
      );
    }

    // Filtre par période
    if (this.filterState.periode) {
      resultats = this.filtrerParPeriode(resultats);
    }

    // Filtre par dates personnalisées
    if (this.filterState.dateDebut || this.filterState.dateFin) {
      resultats = this.filtrerParDatePersonnalisee(resultats);
    }

    // Tri
    resultats = this.trierResultats(resultats);

    // Mise à jour de l'état
    this.historiqueFiltered = resultats;
    this.paginationState.totalItems = resultats.length;
    
    // ✅ PAGINATION INTELLIGENTE
    this.smartPagination();
    
    this.mettreAJourSelectionTout();
  }

  // ✅ PAGINATION INTELLIGENTE
  private smartPagination(): void {
    const totalItems = this.historiqueFiltered.length;
    const currentItemsPerPage = this.paginationState.itemsPerPage;
    
    // Si on a moins d'éléments que ce qu'on peut afficher, ajuster
    if (totalItems <= currentItemsPerPage && totalItems > 0) {
      this.paginationState.currentPage = 1;
    }
    
    // Si on est sur une page qui n'existe plus après filtrage
    const maxPage = this.totalPages();
    if (this.paginationState.currentPage > maxPage && maxPage > 0) {
      this.paginationState.currentPage = maxPage;
    }
  }

  private filtrerParPeriode(data: HistoriqueAction[]): HistoriqueAction[] {
    return data.filter(action => {
      if (!action.dateAction) return false;
      
      const dateAction = new Date(action.dateAction);
      const maintenant = new Date();
      
      switch (this.filterState.periode) {
        case 'today':
          return this.isSameDay(dateAction, maintenant);
          
        case 'yesterday':
          const hier = new Date(maintenant);
          hier.setDate(maintenant.getDate() - 1);
          return this.isSameDay(dateAction, hier);
          
        case 'week':
          const debutSemaine = this.getStartOfWeek(maintenant);
          return dateAction >= debutSemaine;
          
        case 'month':
          const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
          return dateAction >= debutMois;
          
        default:
          return true;
      }
    });
  }

  private filtrerParDatePersonnalisee(data: HistoriqueAction[]): HistoriqueAction[] {
    return data.filter(action => {
      if (!action.dateAction) return false;
      
      const dateAction = new Date(action.dateAction);
      const debut = this.filterState.dateDebut ? new Date(this.filterState.dateDebut + 'T00:00:00') : null;
      const fin = this.filterState.dateFin ? new Date(this.filterState.dateFin + 'T23:59:59') : null;
      
      return (!debut || dateAction >= debut) && (!fin || dateAction <= fin);
    });
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  private getStartOfWeek(date: Date): Date {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  }

  // 🔄 TRI
  private trierResultats(data: HistoriqueAction[]): HistoriqueAction[] {
    return data.sort((a, b) => {
      let valA: any, valB: any;
      
      switch (this.sortState.column) {
        case 'dateAction':
          valA = new Date(a.dateAction || 0).getTime();
          valB = new Date(b.dateAction || 0).getTime();
          break;
        case 'categorie':
          valA = this.getCategorieAction(a).toLowerCase();
          valB = this.getCategorieAction(b).toLowerCase();
          break;
        case 'agent':
          valA = this.getAgentFullName(a.agent).toLowerCase();
          valB = this.getAgentFullName(b.agent).toLowerCase();
          break;
        default:
          valA = (a[this.sortState.column as keyof HistoriqueAction] || '').toString().toLowerCase();
          valB = (b[this.sortState.column as keyof HistoriqueAction] || '').toString().toLowerCase();
      }

      if (valA < valB) return this.sortState.direction === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortState.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  trierPar(colonne: string): void {
    if (this.sortState.column === colonne) {
      this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortState.column = colonne;
      this.sortState.direction = 'asc';
    }
    this.appliquerFiltres();
  }

  // 📄 PAGINATION
  historiqueFiltre(): HistoriqueAction[] {
    return this.historiqueFiltered;
  }

  totalPages(): number {
    const total = Math.ceil(this.historiqueFiltered.length / this.paginationState.itemsPerPage);
    return total || 1;
  }

  changerPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.paginationState.currentPage = page;
    }
  }

  getPagesArray(): number[] {
    const total = this.totalPages();
    const maxPagesToShow = 7;
    const currentPage = this.paginationState.currentPage;
    
    if (total <= maxPagesToShow) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    
    const start = Math.max(1, currentPage - 3);
    const end = Math.min(total, start + maxPagesToShow - 1);
    
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // ✅ GESTION DE LA SÉLECTION
  toggleSelection(id: number): void {
    if (this.lignesSelectionnees.has(id)) {
      this.lignesSelectionnees.delete(id);
    } else {
      this.lignesSelectionnees.add(id);
    }
    this.mettreAJourSelectionTout();
  }

  toggleSelectionTout(): void {
    const donneesPage = this.getDonneesPageActuelle();
    
    if (this.toutSelectionner) {
      donneesPage.forEach(item => this.lignesSelectionnees.add(item.id));
    } else {
      donneesPage.forEach(item => this.lignesSelectionnees.delete(item.id));
    }
    
    this.mettreAJourSelectionTout();
  }

  selectionnerTous(): void {
    const donneesPage = this.getDonneesPageActuelle();
    donneesPage.forEach(item => this.lignesSelectionnees.add(item.id));
    this.mettreAJourSelectionTout();
    this.showNotification(`${donneesPage.length} éléments sélectionnés`, 'success');
  }

  deselectionnerTous(): void {
    this.lignesSelectionnees.clear();
    this.toutSelectionner = false;
    this.showNotification('Sélection effacée', 'info');
  }

  private getDonneesPageActuelle(): HistoriqueAction[] {
    const debut = (this.paginationState.currentPage - 1) * this.paginationState.itemsPerPage;
    const fin = debut + this.paginationState.itemsPerPage;
    return this.historiqueFiltered.slice(debut, fin);
  }

  private mettreAJourSelectionTout(): void {
    const donneesPage = this.getDonneesPageActuelle();
    const toutesSelectionnees = donneesPage.length > 0 && 
      donneesPage.every(item => this.lignesSelectionnees.has(item.id));
    this.toutSelectionner = toutesSelectionnees;
  }

  // 📊 STATISTIQUES
  nombreCreations(): number {
    return this.historiqueFiltered.filter(a => 
      this.getCategorieAction(a) === 'Ajout Visiteur'
    ).length;
  }

  nombreModifications(): number {
    return this.historiqueFiltered.filter(a => 
      this.getCategorieAction(a) === 'Modification Visiteur'
    ).length;
  }

  // 📤 EXPORT EXCEL OPTIMISÉ
  exporterExcelTout(): void {
    if (this.historique.length === 0) {
      this.showNotification('Aucune donnée à exporter', 'warning');
      return;
    }
    this.exporterExcel(this.historique, 'historique_complet.xlsx');
  }

  exporterExcelFiltre(): void {
    if (this.historiqueFiltered.length === 0) {
      this.showNotification('Aucune donnée filtrée à exporter', 'warning');
      return;
    }
    this.exporterExcel(this.historiqueFiltered, 'historique_filtre.xlsx');
  }

  exporterExcelSelection(): void {
    if (this.lignesSelectionnees.size === 0) {
      this.showNotification('Aucune ligne sélectionnée pour l\'export', 'warning');
      return;
    }
    
    const selection = this.historique.filter(item => 
      this.lignesSelectionnees.has(item.id)
    );
    this.exporterExcel(selection, 'historique_selection.xlsx');
  }

  exporterExcel(data: HistoriqueAction[], fileName: string): void {
    try {
      // ✅ FEEDBACK DE DÉBUT D'EXPORT
      this.showNotification('Préparation de l\'export en cours...', 'info');
      
      const dataToExport = data.map((item, index) => ({
        'N°': index + 1,
        'Agent': this.getAgentFullName(item.agent),
        'Rôle': this.getAgentRole(item.agent),
        'Statut Agent': this.getAgentStatus(item.agent) === 'actif' ? 'Actif' : 'Inactif',
        'Type d\'action': this.getCategorieAction(item),
        'Description': this.getCleanActionText(item.action),
        'Date': item.dateAction ? new Date(item.dateAction).toLocaleDateString('fr-FR') : 'N/A',
        'Heure': item.dateAction ? new Date(item.dateAction).toLocaleTimeString('fr-FR') : 'N/A',
        'Durée (ms)': item.metadata?.duration || 'N/A',
        'Adresse IP': item.metadata?.ipAddress || 'N/A',
        'ID': item.id
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      
      // ✅ LARGEURS DE COLONNES OPTIMISÉES
      const columnWidths = [
        { wch: 5 }, { wch: 25 }, { wch: 18 }, { wch: 12 }, { wch: 20 },
        { wch: 50 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 }
      ];
      worksheet['!cols'] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Historique');
      
      // ✅ MÉTADONNÉES ENRICHIES
      workbook.Props = {
        Title: 'Historique des Actions - BAMY TRUCKS',
        Subject: `Export de ${data.length} actions d'historique`,
        Author: 'BAMY TRUCKS System',
        CreatedDate: new Date(),
        Comments: `Généré le ${new Date().toLocaleString('fr-FR')} - ${data.length} enregistrements`
      };
      
      XLSX.writeFile(workbook, fileName);
      
      // ✅ FEEDBACK DE SUCCÈS AVEC DÉTAILS
      this.showNotification(
        `✅ Export Excel réussi : ${fileName} (${data.length} enregistrements)`, 
        'success'
      );
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'export Excel :', error);
      this.showNotification('❌ Erreur lors de l\'export Excel', 'error');
    }
  }

  // 🔄 RÉINITIALISATION
  reinitialiserFiltres(): void {
    this.filterState = {
      text: '',
      typeAction: '',
      periode: '',
      dateDebut: '',
      dateFin: ''
    };
    
    this.paginationState.currentPage = 1;
    this.lignesSelectionnees.clear();
    this.toutSelectionner = false;
    
    this.sortState = {
      column: 'dateAction',
      direction: 'desc'
    };
    
    this.appliquerFiltres();
    this.showNotification('Données actualisées', 'info');
  }

  // 🎨 MÉTHODES POUR LES CLASSES CSS DYNAMIQUES
  getRowClass(action: HistoriqueAction): string {
    const classes = ['hover:bg-slate-50', 'transition-all', 'duration-300'];
    
    if (this.lignesSelectionnees.has(action.id)) {
      classes.push('bg-blue-50', 'border-l-4', 'border-blue-400');
    }
    
    const status = this.getAgentStatus(action.agent);
    if (status === 'inactif') {
      classes.push('opacity-75');
    }
    
    return classes.join(' ');
  }

  getBadgeClass(categorie: string): string {
    const baseClasses = 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 hover:scale-105';
    const badgeMap = new Map([
      ['Ajout Visiteur', `${baseClasses} bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200`],
      ['Modification Visiteur', `${baseClasses} bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200`],
      ['Validation Sortie', `${baseClasses} bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200`],
      ['Connexion', `${baseClasses} bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border border-indigo-200`],
      ['Déconnexion', `${baseClasses} bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200`],
      ['Export', `${baseClasses} bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-200`],
      ['Import', `${baseClasses} bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border border-cyan-200`]
    ]);

    return badgeMap.get(categorie) || `${baseClasses} bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200`;
  }

  getDotClass(categorie: string): string {
    const baseClasses = 'w-2 h-2 rounded-full mr-2 flex-shrink-0';
    const dotMap = new Map([
      ['Ajout Visiteur', `${baseClasses} bg-emerald-500`],
      ['Modification Visiteur', `${baseClasses} bg-amber-500`],
      ['Validation Sortie', `${baseClasses} bg-blue-500`],
      ['Connexion', `${baseClasses} bg-indigo-500`],
      ['Déconnexion', `${baseClasses} bg-gray-500`],
      ['Export', `${baseClasses} bg-purple-500`],
      ['Import', `${baseClasses} bg-cyan-500`]
    ]);

    return dotMap.get(categorie) || `${baseClasses} bg-slate-500`;
  }

  // 🔔 SYSTÈME DE NOTIFICATIONS
  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    if (typeof window !== 'undefined') {
      const iconMap = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
      };
      
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="text-lg">${iconMap[type]}</span>
          <span class="font-semibold">${message}</span>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Animation d'entrée
      setTimeout(() => notification.classList.add('show'), 100);
      
      // Suppression automatique
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }, 3000);
    }
  }

  // 🎯 MÉTHODES D'OPTIMISATION DE PERFORMANCE
  trackByActionId(index: number, action: HistoriqueAction): number {
    return action.id;
  }

  // ✅ MÉTHODES OPTIMISÉES POUR LA GESTION DE L'AFFICHAGE
  getVisibleItemsCount(): number {
    const startIndex = (this.paginationState.currentPage - 1) * this.paginationState.itemsPerPage;
    const endIndex = Math.min(startIndex + this.paginationState.itemsPerPage, this.historiqueFiltered.length);
    return endIndex - startIndex;
  }

  getCurrentPageData(): HistoriqueAction[] {
    const startIndex = (this.paginationState.currentPage - 1) * this.paginationState.itemsPerPage;
    const endIndex = startIndex + this.paginationState.itemsPerPage;
    return this.historiqueFiltered.slice(startIndex, endIndex);
  }

  // ✅ MÉTHODE POUR AJUSTER MANUELLEMENT LE NOMBRE D'ÉLÉMENTS
  setItemsPerPage(count: number): void {
    if (count >= 10 && count <= 100) {
      this.paginationState.itemsPerPage = count;
      this.paginationState.currentPage = 1;
      this.showNotification(`Affichage modifié : ${count} éléments par page`, 'info');
    }
  }

  // ✅ OPTIONS PRÉDÉFINIES POUR L'AFFICHAGE
  getDisplayOptions(): number[] {
    const optimal = this.calculateOptimalItemsPerPage();
    return [15, 25, optimal, 50].filter((value, index, array) => array.indexOf(value) === index).sort((a, b) => a - b);
  }

  // ✅ MÉTHODE POUR VÉRIFIER SI ON PEUT AFFICHER PLUS D'ÉLÉMENTS
  canDisplayMore(): boolean {
    return this.paginationState.itemsPerPage < this.calculateOptimalItemsPerPage();
  }

  // ✅ MÉTHODE POUR OBTENIR LES STATISTIQUES D'AFFICHAGE
  getDisplayStats(): { current: number; total: number; percentage: number } {
    const current = this.getVisibleItemsCount();
    const total = this.historiqueFiltered.length;
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    return { current, total, percentage };
  }

  // ✅ MÉTHODE POUR OBTENIR DES INFORMATIONS SUR LES PERFORMANCES
  getPerformanceInfo(): { itemsPerPage: number; totalPages: number; currentLoad: string } {
    const itemsPerPage = this.paginationState.itemsPerPage;
    const totalPages = this.totalPages();
    const currentLoad = this.historiqueFiltered.length > 1000 ? 'Élevée' : 
                       this.historiqueFiltered.length > 500 ? 'Moyenne' : 'Faible';
    
    return { itemsPerPage, totalPages, currentLoad };
  }

  // ✅ MÉTHODE POUR BASCULER ENTRE DIFFÉRENTS MODES D'AFFICHAGE
  toggleDisplayMode(): void {
    const modes = [15, 25, this.calculateOptimalItemsPerPage(), 50];
    const currentIndex = modes.indexOf(this.paginationState.itemsPerPage);
    const nextIndex = (currentIndex + 1) % modes.length;
    
    this.setItemsPerPage(modes[nextIndex]);
  }

  // ✅ MÉTHODE POUR VÉRIFIER LA SANTÉ DE L'AFFICHAGE
  checkDisplayHealth(): { status: 'good' | 'warning' | 'critical'; message: string } {
    const totalItems = this.historiqueFiltered.length;
    const itemsPerPage = this.paginationState.itemsPerPage;
    const totalPages = this.totalPages();
    
    if (totalPages > 20) {
      return {
        status: 'warning',
        message: `Beaucoup de pages (${totalPages}). Considérez d'augmenter les éléments par page.`
      };
    }
    
    if (itemsPerPage < 15 && totalItems > 50) {
      return {
        status: 'warning',
        message: 'Affichage sous-optimal. Vous pourriez afficher plus d\'éléments.'
      };
    }
    
    if (totalItems > 1000 && itemsPerPage > 50) {
      return {
        status: 'critical',
        message: 'Performances potentiellement dégradées avec beaucoup d\'éléments.'
      };
    }
    
    return {
      status: 'good',
      message: 'Affichage optimal'
    };
  }

  // ✅ MÉTHODE POUR LE MODE DEBUG DE L'AFFICHAGE
  debugDisplayMode(): void {
    const info = {
      windowHeight: window.innerHeight,
      calculatedItemsPerPage: this.calculateOptimalItemsPerPage(),
      currentItemsPerPage: this.paginationState.itemsPerPage,
      visibleItems: this.getVisibleItemsCount(),
      totalFiltered: this.historiqueFiltered.length,
      performance: this.getPerformanceInfo(),
      displayHealth: this.checkDisplayHealth()
    };
    
    console.log('🔍 Debug Display Mode:', info);
    this.showNotification(`Debug: ${info.currentItemsPerPage} éléments/page (optimal: ${info.calculatedItemsPerPage})`, 'info');
  }

  // 📊 MÉTHODES UTILITAIRES SUPPLÉMENTAIRES
  rafraichirDonnees(): void {
    this.chargerHistorique();
  }

  changerNombreElementsAffichage(nombre: number): void {
    this.paginationState.itemsPerPage = nombre;
    this.paginationState.currentPage = 1;
    this.showNotification(`Affichage modifié : ${nombre} éléments par page`, 'info');
  }

  isMobileView(): boolean {
    return window.innerWidth < 768;
  }

  isTabletView(): boolean {
    return window.innerWidth >= 768 && window.innerWidth < 1024;
  }

  // 🔧 MÉTHODES DE DÉBOGAGE
  debugFilterState(): void {
    console.log('État actuel des filtres :', this.filterState);
    console.log('État de la pagination :', this.paginationState);
    console.log('État du tri :', this.sortState);
    console.log('Sélections :', Array.from(this.lignesSelectionnees));
  }

  // ✅ MÉTHODE POUR OPTIMISER LES PERFORMANCES D'AFFICHAGE
  optimizeDisplayPerformance(): void {
    // Désactive les animations pendant le redimensionnement
    document.body.classList.add('disable-animations');
    
    setTimeout(() => {
      document.body.classList.remove('disable-animations');
    }, 300);
  }

}