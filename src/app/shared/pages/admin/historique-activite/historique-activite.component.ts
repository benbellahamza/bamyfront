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

  // 📄 ÉTAT DE LA PAGINATION - ✅ MODIFIÉ POUR 10 RÉSULTATS
  private paginationState: PaginationState = {
    currentPage: 1,
    itemsPerPage: 10, // ✅ CHANGÉ DE 25 À 10
    totalItems: 0
  };

  // 🔄 ÉTAT DU TRI - ✅ PUBLIC POUR ACCÈS DEPUIS LE TEMPLATE
  sortState: SortState = {
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
  
  // 👥 BASE DE DONNÉES DES AGENTS - ✅ ENRICHIE POUR MEILLEURE RECHERCHE
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
    },
    { 
      nom: 'Leroy', 
      prenom: 'Emma', 
      email: 'emma.leroy@bamytrucks.com', 
      role: 'Responsable',
      isActive: true
    },
    { 
      nom: 'Roux', 
      prenom: 'Thomas', 
      email: 'thomas.roux@bamytrucks.com', 
      role: 'Agent sécurité',
      isActive: true
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
    
    console.log(`🎯 Affichage configuré : ${this.paginationState.itemsPerPage} éléments par page`);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 🚀 INITIALISATION
  private initializeComponent(): void {
    this.chargerHistorique();
    this.setupKeyboardShortcuts();
  }

  // 🔍 CONFIGURATION DE LA RECHERCHE AVEC DEBOUNCE - ✅ AMÉLIORÉE
  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(300), // Légère attente pour éviter trop de requêtes
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

  // 🔍 FILTRAGE OPTIMISÉ - ✅ AMÉLIORÉ POUR LA RECHERCHE PAR NOM/PRÉNOM
  appliquerFiltres(): void {
    let resultats = [...this.historique];

    // ✅ FILTRE PAR TEXTE AMÉLIORÉ - FOCUS SUR NOM/PRÉNOM AGENT
    if (this.filterState.text) {
      const searchTerm = this.filterState.text.toLowerCase().trim();
      
      resultats = resultats.filter(action => {
        // ✅ RECHERCHE PRIORITAIRE PAR NOM/PRÉNOM D'AGENT
        const agentFullName = this.getAgentFullName(action.agent).toLowerCase();
        const agentFirstName = this.getAgentFirstName(action.agent).toLowerCase();
        const agentLastName = this.getAgentLastName(action.agent).toLowerCase();
        
        // Recherche exacte ou partielle dans nom/prénom
        const agentMatch = agentFullName.includes(searchTerm) ||
                          agentFirstName.includes(searchTerm) ||
                          agentLastName.includes(searchTerm) ||
                          agentFirstName.startsWith(searchTerm) ||
                          agentLastName.startsWith(searchTerm);
        
        // ✅ RECHERCHE SECONDAIRE DANS LES AUTRES CHAMPS
        const otherFieldsMatch = this.getCleanActionText(action.action).toLowerCase().includes(searchTerm) ||
                                this.getCategorieAction(action).toLowerCase().includes(searchTerm) ||
                                this.getAgentRole(action.agent).toLowerCase().includes(searchTerm);
        
        // Priorité à la recherche d'agent, puis aux autres champs
        return agentMatch || otherFieldsMatch;
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

  // ✅ NOUVELLES MÉTHODES POUR EXTRAIRE NOM/PRÉNOM
  private getAgentFirstName(agentString: string): string {
    const agent = this.findAgentByString(agentString);
    if (agent) return agent.prenom;
    
    const fullName = this.getAgentFullName(agentString);
    const parts = fullName.split(' ');
    return parts[0] || '';
  }

  private getAgentLastName(agentString: string): string {
    const agent = this.findAgentByString(agentString);
    if (agent) return agent.nom;
    
    const fullName = this.getAgentFullName(agentString);
    const parts = fullName.split(' ');
    return parts[1] || '';
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

  // 📄 PAGINATION - ✅ MÉTHODES AMÉLIORÉES
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
      // ✅ SCROLL VERS LE HAUT APRÈS CHANGEMENT DE PAGE
      this.scrollToTop();
    }
  }

  // ✅ PAGINATION COMPACTE ET STYLÉE
  getPagesArray(): number[] {
    const total = this.totalPages();
    const maxPagesToShow = 5; // ✅ RÉDUIT POUR UN STYLE PLUS COMPACT
    const currentPage = this.paginationState.currentPage;
    
    if (total <= maxPagesToShow) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(total, start + maxPagesToShow - 1);
    
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // ✅ MÉTHODES DE NAVIGATION PAGINATION
  pagePrecedente(): void {
    if (this.pageActuelle > 1) {
      this.changerPage(this.pageActuelle - 1);
    }
  }

  pageSuivante(): void {
    if (this.pageActuelle < this.totalPages()) {
      this.changerPage(this.pageActuelle + 1);
    }
  }

  premierePage(): void {
    this.changerPage(1);
  }

  dernierePage(): void {
    this.changerPage(this.totalPages());
  }

  private scrollToTop(): void {
    const tableContainer = document.querySelector('.table-scroll-container');
    if (tableContainer) {
      tableContainer.scrollTop = 0;
    }
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
      
      const columnWidths = [
        { wch: 5 }, { wch: 25 }, { wch: 18 }, { wch: 12 }, { wch: 20 },
        { wch: 50 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 }
      ];
      worksheet['!cols'] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Historique');
      
      workbook.Props = {
        Title: 'Historique des Actions - BAMY TRUCKS',
        Subject: `Export de ${data.length} actions d'historique`,
        Author: 'BAMY TRUCKS System',
        CreatedDate: new Date(),
        Comments: `Généré le ${new Date().toLocaleString('fr-FR')} - ${data.length} enregistrements`
      };
      
      XLSX.writeFile(workbook, fileName);
      
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
      
      setTimeout(() => notification.classList.add('show'), 100);
      
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

  // ✅ MÉTHODES POUR L'AFFICHAGE ET LES STATISTIQUES
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

  // ✅ INFORMATIONS DE PAGINATION POUR L'AFFICHAGE
  getPaginationInfo(): { start: number; end: number; total: number } {
    const start = (this.paginationState.currentPage - 1) * this.paginationState.itemsPerPage + 1;
    const end = Math.min(this.paginationState.currentPage * this.paginationState.itemsPerPage, this.historiqueFiltered.length);
    const total = this.historiqueFiltered.length;
    
    return { start, end, total };
  }

  // ✅ VÉRIFICATIONS POUR LA PAGINATION
  hasPreviousPage(): boolean {
    return this.paginationState.currentPage > 1;
  }

  hasNextPage(): boolean {
    return this.paginationState.currentPage < this.totalPages();
  }

  // ✅ MÉTHODES UTILITAIRES POUR LA RECHERCHE
  clearSearch(): void {
    this.filtreTexte = '';
    this.appliquerFiltres();
    this.focusSearchInput();
  }

  getSearchResultsInfo(): string {
    const total = this.historiqueFiltered.length;
    const hasFilter = this.filterState.text || this.filterState.typeAction || this.filterState.periode;
    
    if (!hasFilter) {
      return `${total} action${total > 1 ? 's' : ''} au total`;
    }
    
    const originalTotal = this.historique.length;
    return `${total} résultat${total > 1 ? 's' : ''} sur ${originalTotal} action${originalTotal > 1 ? 's' : ''}`;
  }

  // ✅ MÉTHODES POUR LES AGENTS (suggestions de recherche)
  getAgentSuggestions(): string[] {
    const suggestions = new Set<string>();
    
    // Ajouter les noms complets
    this.agents.forEach(agent => {
      suggestions.add(`${agent.prenom} ${agent.nom}`);
      suggestions.add(agent.prenom);
      suggestions.add(agent.nom);
    });
    
    return Array.from(suggestions).sort();
  }

  // 📊 MÉTHODES UTILITAIRES SUPPLÉMENTAIRES
  rafraichirDonnees(): void {
    this.chargerHistorique();
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

  // ✅ MÉTHODE POUR TESTER LA RECHERCHE AVEC DES EXEMPLES
  testSearch(term: string): void {
    this.filtreTexte = term;
    this.appliquerFiltres();
    this.showNotification(`Recherche lancée pour : "${term}"`, 'info');
  }

  // ✅ MÉTHODES POUR OBTENIR DES STATISTIQUES DE RECHERCHE
  getSearchStats(): { totalResults: number; filteredResults: number; pageResults: number } {
    return {
      totalResults: this.historique.length,
      filteredResults: this.historiqueFiltered.length,
      pageResults: this.getVisibleItemsCount()
    };
  }

}