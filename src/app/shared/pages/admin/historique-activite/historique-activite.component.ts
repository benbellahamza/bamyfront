import { Component, OnInit, HostListener } from '@angular/core';
import { HistoriqueService } from 'app/core/services/historique/historique.service';
import { AdminService } from 'app/core/services/admin/admin.service';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

@Component({
  selector: 'app-historique-activite',
  standalone:false,
  templateUrl: './historique-activite.component.html',
  styleUrls: ['./historique-activite.component.css']
})
export class HistoriqueActiviteComponent implements OnInit {
  historique: any[] = [];
  filtreTexte = '';
  filtreAgent = '';
  filtreTypeAction = '';
  filtrePeriode = '';
  dateDebut = '';
  dateFin = '';
  pageActuelle = 1;
  nombreElementsAffichage: number = 10;
  colonneTri = 'dateAction';
  ordreTri = 'desc';
  afficherPlusFiltres = false;
  actionSelectionnee: any = null;
  Math = Math;

  menuOuvert = false;
  modalePasswordVisible = false;
  ancienMotDePasse = '';
  nouveauMotDePasse = '';
  messageSuccess = '';
  messageErreur = '';
  motDePasseVisible = false;
  confirmationVisible = false;
  confirmationMotDePasse: string = '';

  utilisateur = {
    nom: '',
    prenom: '',
    email: '',
    role: ''
  };

  constructor(
    private historiqueService: HistoriqueService,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.recupererInfosUtilisateur();
    this.chargerHistorique();
  }

  recupererInfosUtilisateur() {
    const token = localStorage.getItem('access-token');
    if (!token) return;

    try {
      const payload = token.split('.')[1];
      const decodedPayload = atob(payload);
      const decoded = JSON.parse(decodedPayload);

      this.utilisateur = {
        nom: decoded.nom || '',
        prenom: decoded.prenom || '',
        email: decoded.sub || '',
        role: decoded.scope || 'ADMIN'
      };
    } catch (e) {
      console.error('Erreur de décodage du JWT :', e);
    }
  }

  chargerHistorique(): void {
    this.historiqueService.getHistorique().subscribe({
      next: (res) => this.historique = res,
      error: (err) => {
        console.error('❌ Erreur chargement historique :', err);
        this.historique = [];
      }
    });
  }

  appliquerFiltres(): void {
    this.pageActuelle = 1; // Reset pagination sur filtre
  }

  togglePlusFiltres(): void {
    this.afficherPlusFiltres = !this.afficherPlusFiltres;
  }

  resetPagination(): void {
    this.pageActuelle = 1;
  }

  historiqueFiltre(): any[] {
    return this.historique
      .filter(action => {
        const texte = this.filtreTexte.toLowerCase();
        const agent = this.filtreAgent;
        const typeAction = this.filtreTypeAction;
        const dateAction = new Date(action.dateAction);

        const matchTexte = !texte || 
          action.agent.toLowerCase().includes(texte) ||
          action.action.toLowerCase().includes(texte) ||
          action.typeAction.toLowerCase().includes(texte);

        const matchAgent = !agent || action.agent === agent;
        const matchType = !typeAction || action.typeAction === typeAction;

        let matchPeriode = true;
        if (this.filtrePeriode) {
          const now = new Date();
          const startOfDay = new Date(now.setHours(0, 0, 0, 0));
          const startOfYesterday = new Date(startOfDay);
          startOfYesterday.setDate(startOfDay.getDate() - 1);
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          switch (this.filtrePeriode) {
            case 'today':
              matchPeriode = dateAction >= startOfDay;
              break;
            case 'yesterday':
              matchPeriode = dateAction >= startOfYesterday && dateAction < startOfDay;
              break;
            case 'week':
              matchPeriode = dateAction >= startOfWeek;
              break;
            case 'month':
              matchPeriode = dateAction >= startOfMonth;
              break;
            case 'custom':
              const debut = this.dateDebut ? new Date(this.dateDebut) : null;
              const fin = this.dateFin ? new Date(this.dateFin + 'T23:59:59') : null;
              matchPeriode = 
                (!debut || dateAction >= debut) && 
                (!fin || dateAction <= fin);
              break;
          }
        }

        return matchTexte && matchAgent && matchType && matchPeriode;
      })
      .sort((a, b) => {
        const valA = this.colonneTri === 'dateAction' 
          ? new Date(a.dateAction).getTime() 
          : a[this.colonneTri]?.toString().toLowerCase() || '';
        const valB = this.colonneTri === 'dateAction' 
          ? new Date(b.dateAction).getTime() 
          : b[this.colonneTri]?.toString().toLowerCase() || '';

        return this.ordreTri === 'asc'
          ? valA > valB ? 1 : -1
          : valA < valB ? 1 : -1;
      });
  }

  trierPar(colonne: string): void {
    if (this.colonneTri === colonne) {
      this.ordreTri = this.ordreTri === 'asc' ? 'desc' : 'asc';
    } else {
      this.colonneTri = colonne;
      this.ordreTri = 'asc';
    }
  }

  totalPages(): number {
    return Math.ceil(this.historiqueFiltre().length / this.nombreElementsAffichage);
  }

  changerPage(page: number): void {
    this.pageActuelle = page;
  }

  getPagesArray(): number[] {
    const total = this.totalPages();
    const pages = [];
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  afficherDetails(action: any): void {
    this.actionSelectionnee = action;
  }

  listeAgents(): string[] {
    const agents = this.historique.map(a => a.agent);
    return [...new Set(agents)].sort();
  }

  nombreCreations(): number {
    return this.historiqueFiltre().filter(a => a.typeAction === 'creation').length;
  }

  nombreModifications(): number {
    return this.historiqueFiltre().filter(a => a.typeAction === 'modification').length;
  }

  nombreAgentsActifs(): number {
    const agents = this.historiqueFiltre().map(a => a.agent);
    return new Set(agents).size;
  }

  pourcentageTotal(): number {
    return this.historique.length === 0 ? 0 : Math.round((this.historiqueFiltre().length / this.historique.length) * 100);
  }

  pourcentageModifications(): number {
    const total = this.historiqueFiltre().length;
    return total === 0 ? 0 : Math.round((this.nombreModifications() / total) * 100);
  }

  pourcentageAgentsActifs(): number {
    return this.historiqueFiltre().length === 0 ? 0 :
      Math.round((this.nombreAgentsActifs() / this.historiqueFiltre().length) * 100);
  }

  evolutionCreations(): number {
    return 12; // Valeur fictive, à calculer dynamiquement si souhaité
  }

  getCreationTrend(): string {
    return '↗️ En hausse par rapport à la période précédente';
  }

  getModificationTrend(): string {
    return '📊 Stable par rapport à la dernière période';
  }

  exporterCSV(): void {
    const data = this.historiqueFiltre().map(item => ({
      'Agent': item.agent,
      'Type': item.typeAction,
      'Action': item.action,
      'Date': new Date(item.dateAction).toLocaleString('fr-FR')
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historique');
    XLSX.writeFile(workbook, 'historique_activites.csv');
  }

  exporterExcel(): void {
    this.exporterCSV(); // Même logique que CSV
  }

  exporterDetailsJSON(action: any): void {
    const blob = new Blob([JSON.stringify(action.details, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'details_action.json';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  reinitialiserFiltres(): void {
    this.filtreTexte = '';
    this.filtreAgent = '';
    this.filtreTypeAction = '';
    this.filtrePeriode = '';
    this.dateDebut = '';
    this.dateFin = '';
    this.pageActuelle = 1;
  }


  ouvrirModalePassword(): void {
    this.modalePasswordVisible = true;
    this.messageSuccess = '';
    this.messageErreur = '';
    this.ancienMotDePasse = '';
    this.nouveauMotDePasse = '';
  }

  fermerModalePassword(): void {
    this.modalePasswordVisible = false;
  }

  changerMotDePasse(): void {
    if (!this.ancienMotDePasse || !this.nouveauMotDePasse) {
      this.messageErreur = '❌ Veuillez remplir les deux champs.';
      return;
    }

    this.adminService.changerMotDePasseActuel(
      this.utilisateur.email,
      this.ancienMotDePasse,
      this.nouveauMotDePasse
    ).subscribe({
      next: () => {
        this.messageSuccess = '✅ Mot de passe changé avec succès.';
        this.messageErreur = '';
      },
      error: (err) => {
        this.messageErreur = err.error?.message || '❌ Erreur lors du changement.';
        this.messageSuccess = '';
      }
    });
  }

  logout(): void {
    localStorage.removeItem('access-token');
    localStorage.removeItem('role');
    window.location.href = '/';
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.relative');
    if (!clickedInside) this.menuOuvert = false;
  }
}
