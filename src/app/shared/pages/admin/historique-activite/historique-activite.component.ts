import { Component, OnInit, HostListener } from '@angular/core';
import { HistoriqueService } from 'app/core/services/historique/historique.service';
import { AdminService } from 'app/core/services/admin/admin.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-historique-activite',
  standalone: false,
  templateUrl: './historique-activite.component.html',
  styleUrls: ['./historique-activite.component.css']
})
export class HistoriqueActiviteComponent implements OnInit {
  historique: any[] = [];
  filtreTexte = '';
  filtreDateDebut = '';
  filtreDateFin = '';
  filtreTypeAction = '';
  triCroissant = false;
  selectedActions: number[] = [];

  // 🔐 Menu utilisateur & changement de mot de passe
  menuOuvert = false;
  modalePasswordVisible = false;
  ancienMotDePasse = '';
  nouveauMotDePasse = '';
  messageSuccess = '';
  messageErreur = '';
  
    utilisateur = {
    nom: '',
    prenom: '',
    email: '',
    role: ''
  };


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
  constructor(
    private historiqueService: HistoriqueService,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.recupererInfosUtilisateur();
    this.chargerHistorique();
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

  historiqueFiltre(): any[] {
    return this.historique
      .filter(action => {
        const texte = this.filtreTexte.toLowerCase();
        const dateAction = new Date(action.dateAction);
        const matchTexte =
          action.agent.toLowerCase().includes(texte) ||
          action.action.toLowerCase().includes(texte);

        const matchDateDebut = this.filtreDateDebut
          ? dateAction >= new Date(this.filtreDateDebut)
          : true;

        const matchDateFin = this.filtreDateFin
          ? dateAction <= new Date(this.filtreDateFin + 'T23:59:59')
          : true;

        const matchType = this.filtreTypeAction
          ? action.typeAction === this.filtreTypeAction
          : true;

        return matchTexte && matchDateDebut && matchDateFin && matchType;
      })
      .sort((a, b) => {
        const dateA = new Date(a.dateAction).getTime();
        const dateB = new Date(b.dateAction).getTime();
        return this.triCroissant ? dateA - dateB : dateB - dateA;
      });
  }

  resetFiltres(): void {
    this.filtreTexte = '';
    this.filtreDateDebut = '';
    this.filtreDateFin = '';
    this.filtreTypeAction = '';
    this.selectedActions = [];
  }

  toggleTri(): void {
    this.triCroissant = !this.triCroissant;
  }

  toggleSelection(id: number): void {
    if (this.selectedActions.includes(id)) {
      this.selectedActions = this.selectedActions.filter(a => a !== id);
    } else {
      this.selectedActions.push(id);
    }
  }

  selectAll(): void {
    const allIds = this.historiqueFiltre().map(a => a.id);
    this.selectedActions =
      this.selectedActions.length === allIds.length ? [] : [...allIds];
  }

  isSelected(id: number): boolean {
    return this.selectedActions.includes(id);
  }

  exporterExcel(tout: boolean): void {
    const data = tout
      ? this.historiqueFiltre()
      : this.historique.filter(a => this.selectedActions.includes(a.id));

    const dataFormatted = data.map(item => ({
      Agent: item.agent,
      Action: item.action,
      Date: new Date(item.dateAction).toLocaleString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataFormatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historique');

    const filename = tout ? 'historique_complet.xlsx' : 'historique_selection.xlsx';
    XLSX.writeFile(workbook, filename);
  }

  getActionIcon(type: string): string {
    switch (type) {
      case 'Ajout': return '➕';
      case 'Modification': return '✏️';
      case 'Suppression': return '❌';
      default: return '📝';
    }
  }

  getActionColor(type: string): string {
    switch (type) {
      case 'Ajout': return 'bg-green-100 text-green-800';
      case 'Modification': return 'bg-blue-100 text-blue-800';
      case 'Suppression': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
    this.ancienMotDePasse = '';
    this.nouveauMotDePasse = '';
  }

 changerMotDePasse(): void {
  if (!this.ancienMotDePasse || !this.nouveauMotDePasse) {
    this.messageErreur = '❌ Veuillez remplir les deux champs.';
    return;
  }

  this.adminService.changerMotDePasseActuel(this.utilisateur.email, this.ancienMotDePasse, this.nouveauMotDePasse)
    .subscribe({
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
