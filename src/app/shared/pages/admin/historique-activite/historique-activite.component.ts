import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { HistoriqueService } from 'app/core/services/historique/historique.service';
import { AdminService } from 'app/core/services/admin/admin.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import * as XLSX from 'xlsx';

// 🔧 INTERFACES OPTIMISÉES
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
  
  // 🔍 ÉTAT DES FILTRES - OPTIMISÉ
  private filterState: FilterState = {
    text: '',
    typeAction: '',
    periode: '',
    dateDebut: '',
    dateFin: ''
  };

  // 📄 ÉTAT DE LA PAGINATION - OPTIMISÉ
  private paginationState: PaginationState = {
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0
  };

  // 🔄 ÉTAT DU TRI - OPTIMISÉ
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
  
  // 📅 PROPRIÉTÉS CALCULÉES
  currentYear = new Date().getFullYear();

  // 👥 BASE DE DONNÉES SIMULÉE DES AGENTS ENRICHIE
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

  // 🎯 GETTERS POUR L'ÉTAT - OPTIMISÉS
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
  set nombreElementsAffichage(value: number) { 
    this.paginationState.itemsPerPage = value;
    this.paginationState.currentPage = 1;
  }

  get colonneTri(): string { return this.sortState.column; }
  get ordreTri(): 'asc' | 'desc' { return this.sortState.direction; }

  constructor(
    private historiqueService: HistoriqueService,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 🚀 INITIALISATION OPTIMISÉE
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
      }
    }
  }

  private setupKeyboardShortcuts(): void {
    // Focus automatique sur le champ de recherche au chargement
    setTimeout(() => this.focusSearchInput(), 500);
  }

  private focusSearchInput(): void {
    const searchInput = document.querySelector('input[placeholder*="Nom, prénom"]') as HTMLInputElement;
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
    // Ici vous pouvez ajouter une logique spécifique si nécessaire
    this.showNotification('Mot de passe mis à jour avec succès', 'success');
  }

  // 📊 CHARGEMENT DES DONNÉES OPTIMISÉ
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

  // 👤 GESTION DES INFORMATIONS AGENT OPTIMISÉE
  getAgentFullName(agentString: string): string {
    if (!agentString) return 'Agent inconnu';
    
    // Si c'est déjà un nom complet, on le retourne
    if (agentString.includes(' ')) {
      return agentString;
    }
    
    // Recherche optimisée dans la base de données
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

  // ✨ NETTOYAGE DU TEXTE D'ACTION AMÉLIORÉ
  getCleanActionText(actionText: string): string {
    if (!actionText) return 'Action non définie';
    
    let cleanText = actionText.trim();
    
    // Supprimer les préfixes de type d'action avec regex optimisée
    const prefixRegex = /^(Validation Sortie|Ajout Visiteur|Modification Visiteur|Modification)\s*:\s*/i;
    cleanText = cleanText.replace(prefixRegex, '');
    
    // Nettoyer les doubles espaces et caractères spéciaux
    cleanText = cleanText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\u00C0-\u017F]/g, ' ')
      .trim();
    
    return cleanText || 'Action non définie';
  }

  // 🏷️ GESTION DES CATÉGORIES OPTIMISÉE
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

    // Filtre par texte avec recherche intelligente
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

    // Filtre par période optimisé
    if (this.filterState.periode) {
      resultats = this.filtrerParPeriode(resultats);
    }

    // Filtre par dates personnalisées (DE À)
    if (this.filterState.dateDebut || this.filterState.dateFin) {
      resultats = this.filtrerParDatePersonnalisee(resultats);
    }

    // Tri optimisé
    resultats = this.trierResultats(resultats);

    // Mise à jour de l'état
    this.historiqueFiltered = resultats;
    this.paginationState.totalItems = resultats.length;
    this.paginationState.currentPage = 1;
    this.mettreAJourSelectionTout();
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

  // 🔄 TRI OPTIMISÉ
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

  // 📄 PAGINATION OPTIMISÉE
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
    const maxPagesToShow = 5;
    const currentPage = this.paginationState.currentPage;
    
    if (total <= maxPagesToShow) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(total, start + maxPagesToShow - 1);
    
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // ✅ GESTION DE LA SÉLECTION OPTIMISÉE - CORRIGÉE
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
      // Sélectionner tous les éléments de la page
      donneesPage.forEach(item => this.lignesSelectionnees.add(item.id));
    } else {
      // Désélectionner tous les éléments de la page
      donneesPage.forEach(item => this.lignesSelectionnees.delete(item.id));
    }
    
    this.mettreAJourSelectionTout();
  }

  // ✅ NOUVELLES MÉTHODES DE SÉLECTION
  selectionnerTous(): void {
    const donneesPage = this.getDonneesPageActuelle();
    donneesPage.forEach(item => this.lignesSelectionnees.add(item.id));
    this.mettreAJourSelectionTout();
  }

  deselectionnerTous(): void {
    this.lignesSelectionnees.clear();
    this.toutSelectionner = false;
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

  // 📊 STATISTIQUES OPTIMISÉES
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

  nombreAgentsActifs(): number {
    const agents = this.historiqueFiltered
      .map(a => a.agent)
      .filter(agent => agent && agent.trim() !== '');
    return new Set(agents).size;
  }

  pourcentageTotal(): number {
    if (this.historique.length === 0) return 0;
    return Math.round((this.historiqueFiltered.length / this.historique.length) * 100);
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
      const dataToExport = data.map((item, index) => ({
        'N°': index + 1,
        'Agent': this.getAgentFullName(item.agent),
        'Rôle': this.getAgentRole(item.agent),
        'Statut Agent': this.getAgentStatus(item.agent),
        'Type d\'action': this.getCategorieAction(item),
        'Description': this.getCleanActionText(item.action),
        'Date': item.dateAction ? new Date(item.dateAction).toLocaleString('fr-FR') : 'N/A',
        'Durée (ms)': item.metadata?.duration || 'N/A',
        'Adresse IP': item.metadata?.ipAddress || 'N/A',
        'ID': item.id
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      
      // Configuration des colonnes optimisée
      const columnWidths = [
        { wch: 5 },   // N°
        { wch: 25 },  // Agent
        { wch: 18 },  // Rôle
        { wch: 12 },  // Statut
        { wch: 20 },  // Type
        { wch: 50 },  // Description
        { wch: 20 },  // Date
        { wch: 12 },  // Durée
        { wch: 15 },  // IP
        { wch: 10 }   // ID
      ];
      worksheet['!cols'] = columnWidths;

      // Styles des en-têtes
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellAddress]) continue;
        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1E293B' } },
          alignment: { horizontal: 'center' }
        };
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Historique');
      
      // Métadonnées du fichier
      workbook.Props = {
        Title: 'Historique des Actions - BAMY TRUCKS',
        Subject: 'Export des données d\'historique',
        Author: 'BAMY TRUCKS System',
        CreatedDate: new Date()
      };
      
      XLSX.writeFile(workbook, fileName);
      
      this.showNotification(`Export Excel réussi : ${fileName}`, 'success');
      console.log(`✅ Export Excel réussi : ${fileName}`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'export Excel :', error);
      this.showNotification('Erreur lors de l\'export Excel', 'error');
    }
  }

  // 🔄 RÉINITIALISATION OPTIMISÉE
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
    
    // Réinitialiser le tri
    this.sortState = {
      column: 'dateAction',
      direction: 'desc'
    };
    
    this.appliquerFiltres();
    this.showNotification('Filtres réinitialisés', 'info');
  }

  // 🔄 REFRESH DES DONNÉES
  raffraichirDonnees(): void {
    this.chargerHistorique();
  }

  // 🎨 MÉTHODES POUR LES CLASSES CSS DYNAMIQUES
  getRowClass(action: HistoriqueAction): string {
    const classes = ['hover:bg-slate-50', 'transition-colors', 'duration-200'];
    
    if (this.lignesSelectionnees.has(action.id)) {
      classes.push('bg-blue-50', 'border-l-4', 'border-blue-400');
    }
    
    // Classe selon le statut de l'agent
    const status = this.getAgentStatus(action.agent);
    if (status === 'inactif') {
      classes.push('opacity-75');
    }
    
    return classes.join(' ');
  }

  getBadgeClass(categorie: string): string {
    const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200';
    const badgeMap = new Map([
      ['Ajout Visiteur', `${baseClasses} bg-green-100 text-green-800 hover:bg-green-200`],
      ['Modification Visiteur', `${baseClasses} bg-amber-100 text-amber-800 hover:bg-amber-200`],
      ['Validation Sortie', `${baseClasses} bg-blue-100 text-blue-800 hover:bg-blue-200`],
      ['Connexion', `${baseClasses} bg-indigo-100 text-indigo-800 hover:bg-indigo-200`],
      ['Déconnexion', `${baseClasses} bg-gray-100 text-gray-800 hover:bg-gray-200`],
      ['Export', `${baseClasses} bg-purple-100 text-purple-800 hover:bg-purple-200`],
      ['Import', `${baseClasses} bg-cyan-100 text-cyan-800 hover:bg-cyan-200`]
    ]);

    return badgeMap.get(categorie) || `${baseClasses} bg-slate-100 text-slate-800 hover:bg-slate-200`;
  }

  getDotClass(categorie: string): string {
    const baseClasses = 'w-1.5 h-1.5 rounded-full mr-1.5';
    const dotMap = new Map([
      ['Ajout Visiteur', `${baseClasses} bg-green-500`],
      ['Modification Visiteur', `${baseClasses} bg-amber-500`],
      ['Validation Sortie', `${baseClasses} bg-blue-500`],
      ['Connexion', `${baseClasses} bg-indigo-500`],
      ['Déconnexion', `${baseClasses} bg-gray-500`],
      ['Export', `${baseClasses} bg-purple-500`],
      ['Import', `${baseClasses} bg-cyan-500`]
    ]);

    return dotMap.get(categorie) || `${baseClasses} bg-slate-500`;
  }

  // 🔧 MÉTHODES UTILITAIRES AVANCÉES
  changerNombreElementsAffichage(nombre: number): void {
    this.nombreElementsAffichage = nombre;
    this.showNotification(`Affichage modifié : ${nombre} éléments par page`, 'info');
  }

  // 🔍 RECHERCHE AVANCÉE
  rechercherParAgent(nomAgent: string): void {
    this.filtreTexte = nomAgent;
    this.showNotification(`Recherche par agent : ${nomAgent}`, 'info');
  }

  filtrerParPeriodePersonnalisee(debut: string, fin: string): void {
    this.filtrePeriode = 'custom';
    this.dateDebut = debut;
    this.dateFin = fin;
    this.showNotification(`Période personnalisée appliquée`, 'info');
  }

  // 📊 MÉTHODES D'ANALYSE AVANCÉES
  obtenirTendanceActions(): { [key: string]: number } {
    const tendances: { [key: string]: number } = {};
    
    this.historiqueFiltered.forEach(action => {
      const categorie = this.getCategorieAction(action);
      tendances[categorie] = (tendances[categorie] || 0) + 1;
    });
    
    return tendances;
  }

  obtenirActiviteParHeure(): { [key: string]: number } {
    const activite: { [key: string]: number } = {};
    
    this.historiqueFiltered.forEach(action => {
      if (action.dateAction) {
        const heure = new Date(action.dateAction).getHours();
        const heureKey = `${heure}h`;
        activite[heureKey] = (activite[heureKey] || 0) + 1;
      }
    });
    
    return activite;
  }

  obtenirTopAgents(limit: number = 5): Array<{agent: string, actions: number}> {
    const agentActions: { [key: string]: number } = {};
    
    this.historiqueFiltered.forEach(action => {
      const fullName = this.getAgentFullName(action.agent);
      agentActions[fullName] = (agentActions[fullName] || 0) + 1;
    });
    
    return Object.entries(agentActions)
      .map(([agent, actions]) => ({ agent, actions }))
      .sort((a, b) => b.actions - a.actions)
      .slice(0, limit);
  }

  // 🔍 RECHERCHE INTELLIGENTE PAR MOTS-CLÉS
  rechercherParMotsCles(motsClés: string[]): void {
    this.filtreTexte = motsClés.join(' ');
    this.showNotification(`Recherche par mots-clés : ${motsClés.join(', ')}`, 'info');
  }

  // 📅 FILTRES RAPIDES DE DATES
  filtrerAujourdhui(): void {
    this.filtrePeriode = 'today';
    this.appliquerFiltres();
    this.showNotification('Filtre appliqué : Aujourd\'hui', 'info');
  }

  filtrerCetteSemaine(): void {
    this.filtrePeriode = 'week';
    this.appliquerFiltres();
    this.showNotification('Filtre appliqué : Cette semaine', 'info');
  }

  filtrerCeMois(): void {
    this.filtrePeriode = 'month';
    this.appliquerFiltres();
    this.showNotification('Filtre appliqué : Ce mois', 'info');
  }

  // 💾 SAUVEGARDE ET RESTAURATION D'ÉTAT
  sauvegarderEtatFiltre(): void {
    const etat = {
      filterState: this.filterState,
      sortState: this.sortState,
      paginationState: this.paginationState
    };
    
    localStorage.setItem('historique_filter_state', JSON.stringify(etat));
    this.showNotification('État des filtres sauvegardé', 'success');
  }

  restaurerEtatFiltre(): void {
    try {
      const etatSauve = localStorage.getItem('historique_filter_state');
      if (etatSauve) {
        const etat = JSON.parse(etatSauve);
        this.filterState = { ...this.filterState, ...etat.filterState };
        this.sortState = { ...this.sortState, ...etat.sortState };
        this.paginationState = { ...this.paginationState, ...etat.paginationState };
        this.appliquerFiltres();
        this.showNotification('État des filtres restauré', 'success');
      }
    } catch (error) {
      console.error('Erreur lors de la restauration de l\'état :', error);
      this.showNotification('Erreur lors de la restauration', 'error');
    }
  }

  // 🔔 SYSTÈME DE NOTIFICATIONS
  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    // Simulation d'un système de notification
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Optionnel : Affichage d'une notification temporaire dans l'interface
    if (typeof window !== 'undefined') {
      const iconMap = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
      };
      
      const notification = document.createElement('div');
      notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${this.getNotificationClass(type)}`;
      notification.innerHTML = `${iconMap[type]} ${message}`;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 3000);
    }
  }

  private getNotificationClass(type: string): string {
    const classes = {
      success: 'bg-green-500 text-white',
      error: 'bg-red-500 text-white',
      warning: 'bg-amber-500 text-white',
      info: 'bg-blue-500 text-white'
    };
    return classes[type as keyof typeof classes] || classes.info;
  }

  // 🎯 MÉTHODES D'OPTIMISATION DE PERFORMANCE
  trackByActionId(index: number, action: HistoriqueAction): number {
    return action.id;
  }

  // 🔄 GESTION D'ÉTAT AVANCÉE
  resetToInitialState(): void {
    this.filterState = {
      text: '',
      typeAction: '',
      periode: '',
      dateDebut: '',
      dateFin: ''
    };
    
    this.paginationState = {
      currentPage: 1,
      itemsPerPage: 10,
      totalItems: 0
    };
    
    this.sortState = {
      column: 'dateAction',
      direction: 'desc'
    };
    
    this.lignesSelectionnees.clear();
    this.toutSelectionner = false;
    this.appliquerFiltres();
  }

  // 📊 MÉTHODES DE VALIDATION
  private validateDateRange(): boolean {
    if (this.filterState.dateDebut && this.filterState.dateFin) {
      const debut = new Date(this.filterState.dateDebut);
      const fin = new Date(this.filterState.dateFin);
      
      if (debut > fin) {
        this.showNotification('La date de début doit être antérieure à la date de fin', 'warning');
        return false;
      }
      
      const diffInDays = Math.abs(fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24);
      if (diffInDays > 365) {
        this.showNotification('La période sélectionnée ne peut excéder 365 jours', 'warning');
        return false;
      }
    }
    return true;
  }

  // 🎨 MÉTHODES POUR ANIMATIONS
  onActionRowClick(action: HistoriqueAction): void {
    this.actionSelectionnee = this.actionSelectionnee?.id === action.id ? null : action;
  }

  isActionSelected(action: HistoriqueAction): boolean {
    return this.actionSelectionnee?.id === action.id;
  }

  // 📱 MÉTHODES POUR RESPONSIVE
  isMobileView(): boolean {
    return window.innerWidth < 768;
  }

  isTabletView(): boolean {
    return window.innerWidth >= 768 && window.innerWidth < 1024;
  }

  // 🔧 MÉTHODES DE DÉBOGAGE (à retirer en production)
  debugFilterState(): void {
    console.log('État actuel des filtres :', this.filterState);
    console.log('État de la pagination :', this.paginationState);
    console.log('État du tri :', this.sortState);
    console.log('Sélections :', Array.from(this.lignesSelectionnees));
  }

  // 📈 MÉTHODES POUR MÉTRIQUES
  calculerTempsLePlusFrequent(): string {
    const heures: { [key: number]: number } = {};
    
    this.historiqueFiltered.forEach(action => {
      if (action.dateAction) {
        const heure = new Date(action.dateAction).getHours();
        heures[heure] = (heures[heure] || 0) + 1;
      }
    });
    
    const heureLaPlusFrequente = Object.entries(heures)
      .sort(([,a], [,b]) => b - a)[0];
    
    return heureLaPlusFrequente ? `${heureLaPlusFrequente[0]}h` : 'N/A';
  }

  calculerDureeeMoyenneAction(): number {
    const durees = this.historiqueFiltered
      .map(action => action.metadata?.duration)
      .filter(duration => duration !== undefined) as number[];
    
    if (durees.length === 0) return 0;
    
    const sommeDurees = durees.reduce((sum, duration) => sum + duration, 0);
    return Math.round(sommeDurees / durees.length);
  }

  // 📊 STATISTIQUES POUR DASHBOARD
  obtenirStatistiquesRapides() {
    const donnees = this.historiqueFiltered;
    return {
      total: donnees.length,
      ajouts: this.nombreCreations(),
      modifications: this.nombreModifications(),
      agents: this.nombreAgentsActifs(),
      pourcentage: this.pourcentageTotal(),
      periodeActiveFilters: this.filterState.periode ? 1 : 0,
      textActiveFilters: this.filterState.text ? 1 : 0,
      typeActiveFilters: this.filterState.typeAction ? 1 : 0
    };
  }

}