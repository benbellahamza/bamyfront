import { Component, OnInit, HostListener } from '@angular/core';
import { HistoriqueService } from 'app/core/services/historique/historique.service';
import { AdminService } from 'app/core/services/admin/admin.service';
import * as XLSX from 'xlsx';

// 🔧 INTERFACES
interface HistoriqueAction {
  id: number;
  agent: string;
  action: string;
  dateAction: string;
  typeAction?: string;
}

interface Utilisateur {
  nom: string;
  prenom: string;
  email: string;
  role: string;
}

@Component({
  selector: 'app-historique-activite',
  standalone: false,
  templateUrl: './historique-activite.component.html',
  styleUrls: ['./historique-activite.component.css']
})
export class HistoriqueActiviteComponent implements OnInit {
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
      icon: 'users'
    },
    {
      label: 'Gestion des livraisons',
      route: '/admin/livraison',
      icon: 'truck'
    }
  ];

  // 📊 DONNÉES PRINCIPALES
  historique: HistoriqueAction[] = [];
  
  // 🔍 FILTRES
  filtreTexte = '';
  filtreTypeAction = '';
  filtrePeriode = '';
  dateDebut = '';
  dateFin = '';
  
  // 📄 PAGINATION
  pageActuelle = 1;
  nombreElementsAffichage = 10;
  
  // 🔄 TRI
  colonneTri = 'dateAction';
  ordreTri: 'asc' | 'desc' = 'desc';
  
  // ✅ SÉLECTION
  lignesSelectionnees = new Set<number>();
  toutSelectionner = false;
  
  // 🛠️ UTILITAIRES
  Math = Math;
  actionSelectionnee: HistoriqueAction | null = null;
  isLoading = false;
  
  // 📅 PROPRIÉTÉ POUR L'ANNÉE ACTUELLE
  currentYear = new Date().getFullYear();

  // 👥 BASE DE DONNÉES SIMULÉE DES AGENTS (vous devrez adapter selon votre vraie base)
  private agents = [
    { nom: 'Dupont', prenom: 'Jean', email: 'jean.dupont@bamytrucks.com', role: 'Administrateur' },
    { nom: 'Martin', prenom: 'Marie', email: 'marie.martin@bamytrucks.com', role: 'Agent sécurité' },
    { nom: 'Bernard', prenom: 'Pierre', email: 'pierre.bernard@bamytrucks.com', role: 'Superviseur' },
    { nom: 'Durand', prenom: 'Sophie', email: 'sophie.durand@bamytrucks.com', role: 'Agent accueil' },
    { nom: 'Moreau', prenom: 'Paul', email: 'paul.moreau@bamytrucks.com', role: 'Agent sécurité' }
  ];

  constructor(
    private historiqueService: HistoriqueService,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.chargerHistorique();
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
  chargerHistorique(): void {
    this.isLoading = true;
    this.historiqueService.getHistorique().subscribe({
      next: (res: HistoriqueAction[]) => {
        this.historique = res || [];
        this.resetPagination();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement historique :', err);
        this.historique = [];
        this.isLoading = false;
      }
    });
  }

  // 👤 GESTION DES INFORMATIONS AGENT AMÉLIORÉE
  getAgentFullName(agentString: string): string {
    if (!agentString) return 'Agent inconnu';
    
    // Si c'est déjà un nom complet, on le retourne
    if (agentString.includes(' ')) {
      return agentString;
    }
    
    // Sinon, on cherche dans notre base de données simulée
    const agent = this.agents.find(a => 
      a.nom.toLowerCase() === agentString.toLowerCase() ||
      a.prenom.toLowerCase() === agentString.toLowerCase() ||
      a.email.toLowerCase().includes(agentString.toLowerCase())
    );
    
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
    
    const agent = this.agents.find(a => 
      a.nom.toLowerCase() === agentString.toLowerCase() ||
      a.prenom.toLowerCase() === agentString.toLowerCase() ||
      a.email.toLowerCase().includes(agentString.toLowerCase())
    );
    
    return agent ? agent.role : 'Agent';
  }

  // ✨ NETTOYAGE DU TEXTE D'ACTION
  getCleanActionText(actionText: string): string {
    if (!actionText) return 'Action non définie';
    
    // Supprimer les préfixes de type d'action
    let cleanText = actionText;
    
    // Supprimer "Validation Sortie : ", "Ajout Visiteur : ", etc.
    const prefixes = [
      'Validation Sortie :',
      'Validation Sortie:',
      'Ajout Visiteur :',
      'Ajout Visiteur:',
      'Modification Visiteur :',
      'Modification Visiteur:',
      'Modification :',
      'Modification:'
    ];
    
    for (const prefix of prefixes) {
      if (cleanText.startsWith(prefix)) {
        cleanText = cleanText.substring(prefix.length).trim();
        break;
      }
    }
    
    // Nettoyer les doubles espaces et trim
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    
    return cleanText || 'Action non définie';
  }

  // 🏷️ GESTION DES CATÉGORIES
  getCategorieAction(action: HistoriqueAction): string {
    if (!action?.action) return 'Autre';
    
    const actionText = action.action.toLowerCase();
    if (actionText.includes('ajout visiteur') || actionText.startsWith('ajout visiteur')) {
      return 'Ajout Visiteur';
    }
    if (actionText.includes('modification visiteur') || actionText.startsWith('modification visiteur')) {
      return 'Modification Visiteur';
    }
    if (actionText.includes('validation sortie') || actionText.startsWith('validation sortie')) {
      return 'Validation Sortie';
    }
    return 'Autre';
  }

  // 🔍 FILTRAGE ET RECHERCHE
  appliquerFiltres(): void {
    this.pageActuelle = 1;
    this.mettreAJourSelectionTout();
  }

  resetPagination(): void {
    this.pageActuelle = 1;
  }

  historiqueFiltre(): HistoriqueAction[] {
    let resultats = this.historique.filter(action => {
      // Filtre par texte - recherche dans nom/prénom et action nettoyée
      const texte = this.filtreTexte.toLowerCase().trim();
      const fullName = this.getAgentFullName(action.agent).toLowerCase();
      const cleanAction = this.getCleanActionText(action.action).toLowerCase();
      
      const matchTexte = !texte || 
        fullName.includes(texte) ||
        action.agent?.toLowerCase().includes(texte) ||
        cleanAction.includes(texte) ||
        this.getCategorieAction(action).toLowerCase().includes(texte);

      // Filtre par type d'action
      const matchType = !this.filtreTypeAction || 
        this.getCategorieAction(action) === this.filtreTypeAction;

      // Filtre par période
      let matchPeriode = true;
      if (this.filtrePeriode && action.dateAction) {
        const dateAction = new Date(action.dateAction);
        const maintenant = new Date();
        
        switch (this.filtrePeriode) {
          case 'today':
            const debutJour = new Date(maintenant);
            debutJour.setHours(0, 0, 0, 0);
            matchPeriode = dateAction >= debutJour;
            break;
            
          case 'yesterday':
            const hier = new Date(maintenant);
            hier.setDate(maintenant.getDate() - 1);
            hier.setHours(0, 0, 0, 0);
            const finHier = new Date(hier);
            finHier.setHours(23, 59, 59, 999);
            matchPeriode = dateAction >= hier && dateAction <= finHier;
            break;
            
          case 'week':
            const debutSemaine = new Date(maintenant);
            debutSemaine.setDate(maintenant.getDate() - maintenant.getDay());
            debutSemaine.setHours(0, 0, 0, 0);
            matchPeriode = dateAction >= debutSemaine;
            break;
            
          case 'month':
            const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
            matchPeriode = dateAction >= debutMois;
            break;
            
          case 'custom':
            const debut = this.dateDebut ? new Date(this.dateDebut + 'T00:00:00') : null;
            const fin = this.dateFin ? new Date(this.dateFin + 'T23:59:59') : null;
            matchPeriode = (!debut || dateAction >= debut) && (!fin || dateAction <= fin);
            break;
        }
      }

      return matchTexte && matchType && matchPeriode;
    });

    // Tri des résultats
    return resultats.sort((a, b) => {
      let valA: any, valB: any;
      
      switch (this.colonneTri) {
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
          valA = (a[this.colonneTri as keyof HistoriqueAction] || '').toString().toLowerCase();
          valB = (b[this.colonneTri as keyof HistoriqueAction] || '').toString().toLowerCase();
      }

      if (valA < valB) return this.ordreTri === 'asc' ? -1 : 1;
      if (valA > valB) return this.ordreTri === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // 🔄 GESTION DU TRI
  trierPar(colonne: string): void {
    if (this.colonneTri === colonne) {
      this.ordreTri = this.ordreTri === 'asc' ? 'desc' : 'asc';
    } else {
      this.colonneTri = colonne;
      this.ordreTri = 'asc';
    }
  }

  // 📄 GESTION DE LA PAGINATION
  totalPages(): number {
    const total = Math.ceil(this.historiqueFiltre().length / this.nombreElementsAffichage);
    return total || 1;
  }

  changerPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.pageActuelle = page;
    }
  }

  getPagesArray(): number[] {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
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
    const donneesFiltrees = this.historiqueFiltre();
    
    if (this.toutSelectionner) {
      // Désélectionner tout
      donneesFiltrees.forEach(item => this.lignesSelectionnees.delete(item.id));
    } else {
      // Sélectionner tout
      donneesFiltrees.forEach(item => this.lignesSelectionnees.add(item.id));
    }
    
    this.toutSelectionner = !this.toutSelectionner;
  }

  private mettreAJourSelectionTout(): void {
    const donneesFiltrees = this.historiqueFiltre();
    const toutesSelectionnees = donneesFiltrees.length > 0 && 
      donneesFiltrees.every(item => this.lignesSelectionnees.has(item.id));
    this.toutSelectionner = toutesSelectionnees;
  }

  // 📊 STATISTIQUES POUR VOTRE HTML
  nombreCreations(): number {
    return this.historiqueFiltre().filter(a => 
      this.getCategorieAction(a) === 'Ajout Visiteur'
    ).length;
  }

  nombreModifications(): number {
    return this.historiqueFiltre().filter(a => 
      this.getCategorieAction(a) === 'Modification Visiteur'
    ).length;
  }

  nombreAgentsActifs(): number {
    const agents = this.historiqueFiltre()
      .map(a => a.agent)
      .filter(agent => agent && agent.trim() !== '');
    return new Set(agents).size;
  }

  pourcentageTotal(): number {
    if (this.historique.length === 0) return 0;
    return Math.round((this.historiqueFiltre().length / this.historique.length) * 100);
  }

  // 📤 EXPORT EXCEL AMÉLIORÉ
  exporterExcelTout(): void {
    if (this.historique.length === 0) {
      alert('⚠️ Aucune donnée à exporter');
      return;
    }
    this.exporterExcel(this.historique, 'historique_complet.xlsx');
  }

  exporterExcelFiltre(): void {
    const donneesFiltrees = this.historiqueFiltre();
    if (donneesFiltrees.length === 0) {
      alert('⚠️ Aucune donnée filtrée à exporter');
      return;
    }
    this.exporterExcel(donneesFiltrees, 'historique_filtre.xlsx');
  }

  exporterExcelSelection(): void {
    if (this.lignesSelectionnees.size === 0) {
      alert('⚠️ Aucune ligne sélectionnée pour l\'export');
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
        'Type d\'action': this.getCategorieAction(item),
        'Description': this.getCleanActionText(item.action),
        'Date': item.dateAction ? new Date(item.dateAction).toLocaleString('fr-FR') : 'N/A',
        'ID': item.id
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      
      // Ajustement automatique de la largeur des colonnes
      const columnWidths = [
        { wch: 5 },   // N°
        { wch: 25 },  // Agent
        { wch: 15 },  // Rôle
        { wch: 20 },  // Type
        { wch: 50 },  // Description
        { wch: 20 },  // Date
        { wch: 10 }   // ID
      ];
      worksheet['!cols'] = columnWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Historique');
      XLSX.writeFile(workbook, fileName);
      
      console.log(`✅ Export Excel réussi : ${fileName}`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'export Excel :', error);
      alert('❌ Erreur lors de l\'export Excel');
    }
  }

  // 🔄 RÉINITIALISATION
  reinitialiserFiltres(): void {
    this.filtreTexte = '';
    this.filtreTypeAction = '';
    this.filtrePeriode = '';
    this.dateDebut = '';
    this.dateFin = '';
    this.pageActuelle = 1;
    this.lignesSelectionnees.clear();
    this.toutSelectionner = false;
    
    // Réinitialiser le tri
    this.colonneTri = 'dateAction';
    this.ordreTri = 'desc';
  }

  // 🔄 REFRESH DES DONNÉES
  raffraichirDonnees(): void {
    this.chargerHistorique();
  }

  // 📊 STATISTIQUES POUR DASHBOARD
  obtenirStatistiquesRapides() {
    const donnees = this.historiqueFiltre();
    return {
      total: donnees.length,
      ajouts: this.nombreCreations(),
      modifications: this.nombreModifications(),
      agents: this.nombreAgentsActifs(),
      pourcentage: this.pourcentageTotal()
    };
  }

  // 🎨 MÉTHODES POUR LES CLASSES CSS DYNAMIQUES - UNIFIÉES
  getRowClass(action: HistoriqueAction): string {
    const classes = ['hover:bg-slate-50', 'transition-colors', 'duration-200'];
    if (this.lignesSelectionnees.has(action.id)) {
      classes.push('bg-blue-50');
    }
    return classes.join(' ');
  }

  getBadgeClass(categorie: string): string {
    const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium';
    switch (categorie) {
      case 'Ajout Visiteur':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'Modification Visiteur':
        return `${baseClasses} bg-amber-100 text-amber-800`;
      case 'Validation Sortie':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-slate-100 text-slate-800`;
    }
  }

  getDotClass(categorie: string): string {
    const baseClasses = 'w-1.5 h-1.5 rounded-full mr-1.5';
    switch (categorie) {
      case 'Ajout Visiteur':
        return `${baseClasses} bg-green-500`;
      case 'Modification Visiteur':
        return `${baseClasses} bg-amber-500`;
      case 'Validation Sortie':
        return `${baseClasses} bg-blue-500`;
      default:
        return `${baseClasses} bg-slate-500`;
    }
  }

  // 🔧 MÉTHODES UTILITAIRES SUPPLÉMENTAIRES
  changerNombreElementsAffichage(nombre: number): void {
    this.nombreElementsAffichage = nombre;
    this.pageActuelle = 1;
  }

  // 🔍 RECHERCHE AVANCÉE
  rechercherParAgent(nomAgent: string): void {
    this.filtreTexte = nomAgent;
    this.appliquerFiltres();
  }

  filtrerParPeriodePersonnalisee(debut: string, fin: string): void {
    this.filtrePeriode = 'custom';
    this.dateDebut = debut;
    this.dateFin = fin;
    this.appliquerFiltres();
  }
}