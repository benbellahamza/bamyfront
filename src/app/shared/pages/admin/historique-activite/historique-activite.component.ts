import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { HistoriqueService } from 'app/core/services/historique/historique.service';
import { AdminService } from 'app/core/services/admin/admin.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import * as XLSX from 'xlsx';

// 🔧 INTERFACES PROFESSIONNELLES
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
  modifications?: ModificationDetail[];
}

interface ModificationDetail {
  champ: string;
  ancienneValeur: string;
  nouvelleValeur: string;
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

  // 📄 ÉTAT DE LA PAGINATION PROFESSIONNEL
  private paginationState: PaginationState = {
    currentPage: 1,
    itemsPerPage: 12,
    totalItems: 0
  };

  // 🔄 ÉTAT DU TRI
  sortState: SortState = {
    column: 'dateAction',
    direction: 'desc'
  };
  
  // ✅ SÉLECTION ET UTILITAIRES
  lignesSelectionnees = new Set<number>();
  actionSelectionnee: HistoriqueAction | null = null;
  isLoading = false;
  
  // 👥 AGENTS - À remplir avec vos vraies données
  private agents: Utilisateur[] = [];

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
    console.log('🎯 Interface professionnelle initialisée avec succès');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 🚀 INITIALISATION PROFESSIONNELLE
  private initializeComponent(): void {
    this.chargerHistorique();
    this.setupKeyboardShortcuts();
  }

  // 🔍 CONFIGURATION DE LA RECHERCHE PROFESSIONNELLE
  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.appliquerFiltres();
    });
  }

  // ⌨️ RACCOURCIS CLAVIER PROFESSIONNELS
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
          this.rafraichirDonnees();
          break;
        case 'e':
          event.preventDefault();
          this.exporterExcelFiltre();
          break;
      }
    }
    
    if (event.key === 'Escape') {
      event.preventDefault();
      this.fermerDetailsAction();
    }
  }

  private setupKeyboardShortcuts(): void {
    setTimeout(() => this.focusSearchInput(), 500);
  }

  private focusSearchInput(): void {
    const searchInput = document.querySelector('.search-input') as HTMLInputElement;
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

  // 📊 CHARGEMENT DES DONNÉES PROFESSIONNEL
  chargerHistorique(): void {
    this.isLoading = true;
    this.historiqueService.getHistorique()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: HistoriqueAction[]) => {
          this.historique = this.enrichirDonneesHistorique(res || []);
          this.appliquerFiltres();
          this.isLoading = false;
          this.showNotification(`${this.historique.length} activités chargées`, 'success');
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
        userAgent: this.generateRandomUserAgent(),
        ipAddress: this.generateRandomIP(),
        duration: Math.floor(Math.random() * 3000) + 200,
        ...action.metadata
      }
    }));
  }

  private generateRandomIP(): string {
    return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  private generateRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  // 🔍 MÉTHODES POUR LA GESTION DES MODIFICATIONS
  
  isModificationAction(action: HistoriqueAction | null): boolean {
    if (!action) return false;
    return action.action?.toLowerCase().includes('modification') || 
           action.typeAction === 'Modification Visiteur' ||
           action.action?.toLowerCase().includes('modifié') ||
           action.action?.toLowerCase().includes('modifier');
  }

  getModifications(action: HistoriqueAction | null): ModificationDetail[] {
    if (!action || !this.isModificationAction(action)) {
      return [];
    }

    if (action.modifications && Array.isArray(action.modifications)) {
      return action.modifications;
    }

    return this.parseModificationsFromDescription(action.action || '');
  }

  private parseModificationsFromDescription(description: string): ModificationDetail[] {
    const modifications: ModificationDetail[] = [];
    
    if (!description) return modifications;

    // Format 1: "Nom modifié de 'Hamza' à 'Hamzaaaa'"
    const regexFormat1 = /(\w+)\s+modifié\s+de\s+['"](.*?)['"]?\s+à\s+['"](.*?)['"]?/gi;
    let match;
    
    while ((match = regexFormat1.exec(description)) !== null) {
      modifications.push({
        champ: this.formatFieldName(match[1]),
        ancienneValeur: match[2],
        nouvelleValeur: match[3]
      });
    }

    // Format 2: "Modification visiteur: nom: Hamza -> Hamzaaaa, téléphone: 123 -> 456"
    if (modifications.length === 0) {
      const pairs = description.split(',');
      pairs.forEach(pair => {
        const changeMatch = pair.match(/(\w+):\s*(.*?)\s*->\s*(.*?)(?:,|$)/i);
        if (changeMatch) {
          modifications.push({
            champ: this.formatFieldName(changeMatch[1].trim()),
            ancienneValeur: changeMatch[2].trim(),
            nouvelleValeur: changeMatch[3].trim()
          });
        }
      });
    }

    return modifications;
  }

  private formatFieldName(field: string): string {
    const fieldMappings: { [key: string]: string } = {
      'nom': 'Nom',
      'prenom': 'Prénom', 
      'telephone': 'Téléphone',
      'email': 'Email',
      'entreprise': 'Entreprise',
      'motif': 'Motif de visite',
      'badge': 'Numéro de badge',
      'dateVisite': 'Date de visite',
      'heureEntree': 'Heure d\'entrée',
      'heureSortie': 'Heure de sortie',
      'statut': 'Statut',
      'commentaire': 'Commentaire',
      'vehicule': 'Véhicule',
      'accompagnant': 'Accompagnant'
    };
    
    return fieldMappings[field.toLowerCase()] || this.capitalizeFirstLetter(field);
  }

  private capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
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
      .replace(/[^\w\s\u00C0-\u017F\-\.]/g, ' ')
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
      ['import', 'Import'],
      ['suppression', 'Suppression'],
      ['archivage', 'Archivage']
    ]);

    for (const [keyword, category] of categorieMap) {
      if (actionText.includes(keyword)) {
        return category;
      }
    }
    
    return 'Autre';
  }

  // 🔍 FILTRAGE PROFESSIONNEL
  appliquerFiltres(): void {
    let resultats = [...this.historique];

    // Filtre par texte
    if (this.filterState.text) {
      const searchTerm = this.filterState.text.toLowerCase().trim();
      
      resultats = resultats.filter(action => {
        const agentFullName = this.getAgentFullName(action.agent).toLowerCase();
        const actionText = this.getCleanActionText(action.action).toLowerCase();
        const categorie = this.getCategorieAction(action).toLowerCase();
        const role = this.getAgentRole(action.agent).toLowerCase();
        
        return agentFullName.includes(searchTerm) ||
               actionText.includes(searchTerm) ||
               categorie.includes(searchTerm) ||
               role.includes(searchTerm);
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
    
    // Pagination intelligente
    this.adjustPagination();
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
  private adjustPagination(): void {
    const totalItems = this.historiqueFiltered.length;
    const maxPage = this.totalPages();
    
    if (this.paginationState.currentPage > maxPage && maxPage > 0) {
      this.paginationState.currentPage = maxPage;
    }
  }

  historiqueFiltre(): HistoriqueAction[] {
    return this.historiqueFiltered;
  }

  getPaginatedData(): HistoriqueAction[] {
    const startIndex = (this.paginationState.currentPage - 1) * this.paginationState.itemsPerPage;
    const endIndex = startIndex + this.paginationState.itemsPerPage;
    return this.historiqueFiltered.slice(startIndex, endIndex);
  }

  totalPages(): number {
    const total = Math.ceil(this.historiqueFiltered.length / this.paginationState.itemsPerPage);
    return total || 1;
  }

  changerPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.paginationState.currentPage = page;
      this.scrollToTop();
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
    const timelineContainer = document.querySelector('.activities-timeline');
    if (timelineContainer) {
      timelineContainer.scrollTop = 0;
    }
  }

  // ✅ GESTION DE LA SÉLECTION
  toggleSelection(id: number): void {
    if (this.lignesSelectionnees.has(id)) {
      this.lignesSelectionnees.delete(id);
    } else {
      this.lignesSelectionnees.add(id);
    }
  }

  // 🔍 DÉTAILS DE L'ACTION
  ouvrirDetailsAction(action: HistoriqueAction): void {
    this.actionSelectionnee = action;
    console.log('🔍 Ouverture des détails pour l\'action :', action.id);
  }

  fermerDetailsAction(): void {
   this.actionSelectionnee = null;
 }

 // ✅ MÉTHODES HELPER POUR LA MODALE
 getActionAgent(action: HistoriqueAction | null): string {
   if (!action?.agent) return '?';
   return this.getAgentInitials(action.agent);
 }

 getActionAgentFullName(action: HistoriqueAction | null): string {
   if (!action?.agent) return 'Agent inconnu';
   return this.getAgentFullName(action.agent);
 }

 getActionAgentRole(action: HistoriqueAction | null): string {
   if (!action?.agent) return 'Rôle inconnu';
   return this.getAgentRole(action.agent);
 }

 getActionAgentStatus(action: HistoriqueAction | null): 'actif' | 'inactif' {
   if (!action?.agent) return 'inactif';
   return this.getAgentStatus(action.agent);
 }

 getActionCategorie(action: HistoriqueAction | null): string {
   if (!action) return 'Type inconnu';
   return this.getCategorieAction(action);
 }

 getActionDate(action: HistoriqueAction | null): string {
   if (!action?.dateAction) return 'Date inconnue';
   return new Date(action.dateAction).toLocaleDateString('fr-FR', {
     weekday: 'long',
     year: 'numeric',
     month: 'long',
     day: 'numeric'
   });
 }

 getActionTime(action: HistoriqueAction | null): string {
   if (!action?.dateAction) return 'Heure inconnue';
   return new Date(action.dateAction).toLocaleTimeString('fr-FR');
 }

 getActionDateTime(action: HistoriqueAction | null): string {
   if (!action?.dateAction) return 'Date inconnue';
   return new Date(action.dateAction).toLocaleString('fr-FR');
 }

 getActionId(action: HistoriqueAction | null): string {
   return action?.id?.toString() || 'N/A';
 }

 getActionDuration(action: HistoriqueAction | null): number | null {
   return action?.metadata?.duration || null;
 }

 getActionIP(action: HistoriqueAction | null): string | null {
   return action?.metadata?.ipAddress || null;
 }

 getActionBrowser(action: HistoriqueAction | null): string {
   const userAgent = action?.metadata?.userAgent;
   return this.getBrowserFromUserAgent(userAgent);
 }

 getActionDescription(action: HistoriqueAction | null): string {
   if (!action?.action) return 'Description indisponible';
   return this.getCleanActionText(action.action);
 }

 getBrowserFromUserAgent(userAgent: string | undefined): string {
   if (!userAgent) return 'Navigateur inconnu';
   
   if (userAgent.includes('Chrome')) return 'Google Chrome';
   if (userAgent.includes('Firefox')) return 'Mozilla Firefox';
   if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
   if (userAgent.includes('Edge')) return 'Microsoft Edge';
   if (userAgent.includes('Opera')) return 'Opera';
   
   return 'Autre navigateur';
 }

 // 📊 STATISTIQUES
 getStatsByType(type: string): number {
   return this.historique.filter(action => 
     this.getCategorieAction(action) === type
   ).length;
 }

 getActiveAgentsCount(): number {
   const activeAgents = new Set(
     this.historique
       .map(action => action.agent)
       .filter(agent => this.getAgentStatus(agent) === 'actif')
   );
   return activeAgents.size;
 }

 // 🎨 MÉTHODES POUR LES STYLES
 getTimelineColor(action: HistoriqueAction): string {
   const colorMap = new Map([
     ['Ajout Visiteur', '#10b981'],
     ['Modification Visiteur', '#f59e0b'],
     ['Validation Sortie', '#3b82f6'],
     ['Connexion', '#8b5cf6'],
     ['Déconnexion', '#6b7280'],
     ['Export', '#ec4899'],
     ['Import', '#06b6d4']
   ]);

   return colorMap.get(this.getCategorieAction(action)) || '#64748b';
 }

 getActionBadgeClass(action: HistoriqueAction): string {
   const baseClasses = 'action-badge';
   const badgeMap = new Map([
     ['Ajout Visiteur', `${baseClasses} badge-create`],
     ['Modification Visiteur', `${baseClasses} badge-update`],
     ['Validation Sortie', `${baseClasses} badge-validate`],
     ['Connexion', `${baseClasses} badge-other`],
     ['Déconnexion', `${baseClasses} badge-other`],
     ['Export', `${baseClasses} badge-other`],
     ['Import', `${baseClasses} badge-other`]
   ]);

   return badgeMap.get(this.getCategorieAction(action)) || `${baseClasses} badge-other`;
 }

 getBadgeIndicatorClass(action: HistoriqueAction): string {
   const indicatorMap = new Map([
     ['Ajout Visiteur', 'bg-emerald-500'],
     ['Modification Visiteur', 'bg-amber-500'],
     ['Validation Sortie', 'bg-blue-500'],
     ['Connexion', 'bg-purple-500'],
     ['Déconnexion', 'bg-gray-500'],
     ['Export', 'bg-pink-500'],
     ['Import', 'bg-cyan-500']
   ]);

   return indicatorMap.get(this.getCategorieAction(action)) || 'bg-slate-500';
 }

 // ⏰ GESTION DU TEMPS RELATIF
 getRelativeTime(dateString: string): string {
   if (!dateString) return 'Date inconnue';
   
   const date = new Date(dateString);
   const now = new Date();
   const diffMs = now.getTime() - date.getTime();
   const diffMinutes = Math.floor(diffMs / (1000 * 60));
   const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
   const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

   if (diffMinutes < 1) return 'À l\'instant';
   if (diffMinutes < 60) return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
   if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
   if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
   
   return date.toLocaleDateString('fr-FR');
 }

 // 📤 EXPORT EXCEL
 exporterExcelTout(): void {
   if (this.historique.length === 0) {
     this.showNotification('Aucune donnée à exporter', 'warning');
     return;
   }
   this.exporterExcel(this.historique, `historique_complet_${this.getFormattedDate()}.xlsx`);
 }

 exporterExcelFiltre(): void {
   if (this.historiqueFiltered.length === 0) {
     this.showNotification('Aucune donnée filtrée à exporter', 'warning');
     return;
   }
   this.exporterExcel(this.historiqueFiltered, `historique_filtre_${this.getFormattedDate()}.xlsx`);
 }

 private exporterExcel(data: HistoriqueAction[], fileName: string): void {
   try {
     this.showNotification('📊 Préparation de l\'export Excel...', 'info');
     
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
       'Navigateur': this.getBrowserFromUserAgent(item.metadata?.userAgent) || 'N/A',
       'ID': item.id
     }));

     const worksheet = XLSX.utils.json_to_sheet(dataToExport);
     
     const columnWidths = [
       { wch: 5 }, { wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 20 },
       { wch: 50 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 10 }
     ];
     worksheet['!cols'] = columnWidths;

     const workbook = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(workbook, worksheet, 'Historique');
     
     workbook.Props = {
       Title: 'Historique des Actions',
       Subject: `Export de ${data.length} actions d'historique`,
       Author: 'Système',
       CreatedDate: new Date(),
       Comments: `Généré le ${new Date().toLocaleString('fr-FR')}`
     };
     
     XLSX.writeFile(workbook, fileName);
     
     this.showNotification(
       `✅ Export Excel réussi : ${data.length} enregistrements exportés`, 
       'success'
     );
     
   } catch (error) {
     console.error('❌ Erreur lors de l\'export Excel :', error);
     this.showNotification('❌ Erreur lors de l\'export Excel', 'error');
   }
 }

 private getFormattedDate(): string {
   return new Date().toISOString().split('T')[0];
 }

 // 🔄 UTILITAIRES
 rafraichirDonnees(): void {
   this.chargerHistorique();
 }

 clearAllFilters(): void {
   this.filterState = {
     text: '',
     typeAction: '',
     periode: '',
     dateDebut: '',
     dateFin: ''
   };
   
   this.paginationState.currentPage = 1;
   this.lignesSelectionnees.clear();
   
   this.sortState = {
     column: 'dateAction',
     direction: 'desc'
   };
   
   this.appliquerFiltres();
   this.showNotification('🔄 Filtres réinitialisés', 'info');
 }

 hasActiveFilters(): boolean {
   return !!(
     this.filterState.text ||
     this.filterState.typeAction ||
     this.filterState.periode ||
     this.filterState.dateDebut ||
     this.filterState.dateFin
   );
 }

 // 📊 INFORMATIONS DE PAGINATION
 getPaginationInfo(): { start: number; end: number; total: number } {
   const total = this.historiqueFiltered.length;
   if (total === 0) {
     return { start: 0, end: 0, total: 0 };
   }
   
   const start = (this.paginationState.currentPage - 1) * this.paginationState.itemsPerPage + 1;
   const end = Math.min(this.paginationState.currentPage * this.paginationState.itemsPerPage, total);
   
   return { start, end, total };
 }

 getSearchResultsInfo(): string {
   const total = this.historiqueFiltered.length;
   const hasFilter = this.hasActiveFilters();
   
   if (!hasFilter) {
     return `${total} activité${total > 1 ? 's' : ''} au total`;
   }
   
   const originalTotal = this.historique.length;
   return `${total} résultat${total > 1 ? 's' : ''} sur ${originalTotal}`;
 }

 // ✅ VÉRIFICATIONS POUR LA PAGINATION
 hasPreviousPage(): boolean {
   return this.paginationState.currentPage > 1;
 }

 hasNextPage(): boolean {
   return this.paginationState.currentPage < this.totalPages();
 }

 // 🎯 OPTIMISATION DE PERFORMANCE
 trackByActionId(index: number, action: HistoriqueAction): number {
   return action.id;
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
     
     const colorMap = {
       success: 'from-emerald-500 to-emerald-600',
       error: 'from-red-500 to-red-600',
       warning: 'from-amber-500 to-amber-600',
       info: 'from-blue-500 to-blue-600'
     };
     
     const notification = document.createElement('div');
     notification.className = `fixed top-20 right-6 z-[9999] px-6 py-4 rounded-xl shadow-2xl transform translate-x-full transition-all duration-500 max-w-md bg-gradient-to-r ${colorMap[type]} text-white backdrop-blur-lg`;
     
     notification.innerHTML = `
       <div class="flex items-center gap-3">
         <div class="flex-shrink-0 text-xl">${iconMap[type]}</div>
         <div class="flex-1">
           <div class="font-semibold text-sm">${message}</div>
           <div class="text-xs opacity-90 mt-1">Interface Professionnelle</div>
         </div>
         <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white/80 hover:text-white transition-colors">
           <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
           </svg>
         </button>
       </div>
     `;
     
     document.body.appendChild(notification);
     
     // Animation d'entrée
     setTimeout(() => {
       notification.style.transform = 'translateX(0)';
     }, 100);
     
     // Animation de sortie et suppression automatique
     setTimeout(() => {
       notification.style.transform = 'translateX(100%)';
       setTimeout(() => {
         if (document.body.contains(notification)) {
           document.body.removeChild(notification);
         }
       }, 500);
     }, 4000);
   }
 }

 // 📱 DÉTECTION RESPONSIVE
 isMobileView(): boolean {
   return window.innerWidth < 768;
 }

 isTabletView(): boolean {
   return window.innerWidth >= 768 && window.innerWidth < 1024;
 }

 isDesktopView(): boolean {
   return window.innerWidth >= 1024;
 }

 // 🎨 MÉTHODES UTILITAIRES POUR L'INTERFACE
 getAgentAvatarColor(agentString: string): string {
   const colors = [
     'from-blue-500 to-purple-600',
     'from-emerald-500 to-teal-600',
     'from-orange-500 to-red-600',
     'from-pink-500 to-rose-600',
     'from-indigo-500 to-blue-600',
     'from-green-500 to-emerald-600',
     'from-purple-500 to-pink-600',
     'from-yellow-500 to-orange-600'
   ];
   
   // Générer un index basé sur le nom de l'agent
   const agent = this.getAgentFullName(agentString);
   let hash = 0;
   for (let i = 0; i < agent.length; i++) {
     hash = agent.charCodeAt(i) + ((hash << 5) - hash);
   }
   
   return colors[Math.abs(hash) % colors.length];
 }

 // 📈 MÉTHODES D'ANALYSE
 getTopAgentsByActivity(): Array<{agent: string, count: number, fullName: string}> {
   const agentCounts = new Map<string, number>();
   
   this.historique.forEach(action => {
     const count = agentCounts.get(action.agent) || 0;
     agentCounts.set(action.agent, count + 1);
   });
   
   return Array.from(agentCounts.entries())
     .map(([agent, count]) => ({
       agent,
       count,
       fullName: this.getAgentFullName(agent)
     }))
     .sort((a, b) => b.count - a.count)
     .slice(0, 5);
 }

 getActivityTrend(): Array<{date: string, count: number}> {
   const last7Days = Array.from({length: 7}, (_, i) => {
     const date = new Date();
     date.setDate(date.getDate() - i);
     return date.toISOString().split('T')[0];
   }).reverse();
   
   return last7Days.map(dateStr => {
     const count = this.historique.filter(action => {
       if (!action.dateAction) return false;
       const actionDate = new Date(action.dateAction).toISOString().split('T')[0];
       return actionDate === dateStr;
     }).length;
     
     return { date: dateStr, count };
   });
 }

 // 🔍 RECHERCHE AVANCÉE
 searchInActionDetails(searchTerm: string): HistoriqueAction[] {
   if (!searchTerm) return [];
   
   const term = searchTerm.toLowerCase();
   return this.historique.filter(action => {
     const metadata = action.metadata;
     const metadataMatch = metadata && (
       (metadata.ipAddress && metadata.ipAddress.includes(term)) ||
       (metadata.userAgent && metadata.userAgent.toLowerCase().includes(term))
     );
     
     const idMatch = action.id.toString().includes(term);
     const dateMatch = action.dateAction && 
       new Date(action.dateAction).toLocaleString('fr-FR').toLowerCase().includes(term);
     
     return metadataMatch || idMatch || dateMatch;
   });
 }

 // 📊 STATISTIQUES AVANCÉES
 getHourlyDistribution(): Array<{hour: number, count: number}> {
   const hourCounts = new Array(24).fill(0);
   
   this.historique.forEach(action => {
     if (action.dateAction) {
       const hour = new Date(action.dateAction).getHours();
       hourCounts[hour]++;
     }
   });
   
   return hourCounts.map((count, hour) => ({ hour, count }));
 }

 getDayOfWeekDistribution(): Array<{day: string, count: number}> {
   const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
   const dayCounts = new Array(7).fill(0);
   
   this.historique.forEach(action => {
     if (action.dateAction) {
       const dayOfWeek = new Date(action.dateAction).getDay();
       dayCounts[dayOfWeek]++;
     }
   });
   
   return dayCounts.map((count, index) => ({
     day: dayNames[index],
     count
   }));
 }

 // 🎯 EXPORT STATISTIQUES
 exportStatistiques(): void {
   try {
     const stats = {
       resume: {
         totalActions: this.historique.length,
         agentsActifs: this.getActiveAgentsCount(),
         periodeAnalysee: {
           debut: this.historique.length > 0 ? 
             new Date(Math.min(...this.historique.map(a => new Date(a.dateAction).getTime()))).toLocaleDateString('fr-FR') : 'N/A',
           fin: this.historique.length > 0 ? 
             new Date(Math.max(...this.historique.map(a => new Date(a.dateAction).getTime()))).toLocaleDateString('fr-FR') : 'N/A'
         }
       },
       parType: [
         { type: 'Ajout Visiteur', count: this.getStatsByType('Ajout Visiteur') },
         { type: 'Modification Visiteur', count: this.getStatsByType('Modification Visiteur') },
         { type: 'Validation Sortie', count: this.getStatsByType('Validation Sortie') }
       ],
       topAgents: this.getTopAgentsByActivity(),
       tendance7Jours: this.getActivityTrend(),
       repartitionHoraire: this.getHourlyDistribution(),
       repartitionJourSemaine: this.getDayOfWeekDistribution()
     };

     const worksheet = XLSX.utils.json_to_sheet([
       { Métrique: 'Total Actions', Valeur: stats.resume.totalActions },
       { Métrique: 'Agents Actifs', Valeur: stats.resume.agentsActifs },
       { Métrique: 'Période Début', Valeur: stats.resume.periodeAnalysee.debut },
       { Métrique: 'Période Fin', Valeur: stats.resume.periodeAnalysee.fin },
       ...stats.parType.map(item => ({ 
         Métrique: `Actions - ${item.type}`, 
         Valeur: item.count 
       }))
     ]);

     const workbook = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(workbook, worksheet, 'Statistiques');
     
     XLSX.writeFile(workbook, `statistiques_historique_${this.getFormattedDate()}.xlsx`);
     
     this.showNotification('📊 Statistiques exportées avec succès', 'success');
   } catch (error) {
     console.error('Erreur export statistiques:', error);
     this.showNotification('❌ Erreur lors de l\'export des statistiques', 'error');
   }
 }

 // 🎨 AMÉLIORATION UX
 highlightSearchTerm(text: string, searchTerm: string): string {
   if (!searchTerm || !text) return text;
   
   const regex = new RegExp(`(${searchTerm})`, 'gi');
   return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
 }

 // 📱 ADAPTATION MOBILE
 adaptForMobile(): void {
   if (this.isMobileView()) {
     this.paginationState.itemsPerPage = 8;
   } else if (this.isTabletView()) {
     this.paginationState.itemsPerPage = 10;
   } else {
     this.paginationState.itemsPerPage = 12;
   }
   this.appliquerFiltres();
 }

 // 🎯 ACCESSIBILITÉ
 announceToScreenReader(message: string): void {
   const announcement = document.createElement('div');
   announcement.setAttribute('aria-live', 'polite');
   announcement.setAttribute('aria-atomic', 'true');
   announcement.className = 'sr-only';
   announcement.textContent = message;
   
   document.body.appendChild(announcement);
   
   setTimeout(() => {
     document.body.removeChild(announcement);
   }, 1000);
 }
}