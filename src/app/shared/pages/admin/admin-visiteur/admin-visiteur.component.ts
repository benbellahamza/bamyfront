import { Component, OnInit, HostListener } from '@angular/core';
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

  visiteurs: Visiteur[] = [];
  visiteursFiltres: Visiteur[] = [];
  selectedVisiteurs: Visiteur[] = [];

  searchTerm: string = '';
  startDate: string = '';
  endDate: string = '';
  loading: boolean = false;

  utilisateur = {
    nom: '',
    prenom: '',
    email: '',
    role: ''
  };

  menuOuvert: boolean = false;
  modalePasswordVisible = false;

  ancienMotDePasse: string = '';
  nouveauMotDePasse: string = '';
  messageSuccess: string = '';
  messageErreur: string = '';

  erreurExport: boolean = false;

  currentPage: number = 1;
  itemsPerPage: number = 10;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.recupererInfosUtilisateur();
    this.getVisiteurs();
  }

  get nomComplet(): string {
    return `${this.utilisateur.nom} ${this.utilisateur.prenom}`.trim();
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

  ouvrirModalePassword() {
    this.modalePasswordVisible = true;
    this.messageErreur = '';
    this.messageSuccess = '';
  }

  fermerModalePassword() {
    this.modalePasswordVisible = false;
    this.ancienMotDePasse = '';
    this.nouveauMotDePasse = '';
  }

  changerMotDePasse() {
    if (!this.ancienMotDePasse || !this.nouveauMotDePasse) {
      this.messageErreur = "Veuillez remplir les deux champs.";
      this.messageSuccess = "";
      return;
    }

    const payload = {
      ancienMotDePasse: this.ancienMotDePasse,
      nouveauMotDePasse: this.nouveauMotDePasse
    };

    this.http.post('http://localhost:8085/auth/update-password', payload).subscribe({
      next: (res: any) => {
        this.messageSuccess = res.message;
        this.messageErreur = "";
        this.ancienMotDePasse = '';
        this.nouveauMotDePasse = '';
      },
      error: (err) => {
        this.messageErreur = err.error?.error || "❌ Erreur lors de la mise à jour.";
        this.messageSuccess = "";
      }
    });
  }

  get pages(): number[] {
    const total = Math.ceil(this.visiteursFiltres.length / this.itemsPerPage);
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  getVisiteurs() {
    this.loading = true;
    this.http.get<Visiteur[]>('http://localhost:8085/api/visiteurs').subscribe({
      next: (data) => {
        this.visiteurs = data.sort((a, b) => new Date(b.dateEntree).getTime() - new Date(a.dateEntree).getTime());
        this.visiteursFiltres = [...this.visiteurs];
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  rechercher() {
    const terme = this.searchTerm.toLowerCase();
    this.visiteursFiltres = this.visiteurs.filter(v =>
      v.nom.toLowerCase().includes(terme) ||
      v.prenom.toLowerCase().includes(terme) ||
      v.cin.toLowerCase().includes(terme)
    );
  }

  filtrerParDate() {
    if (!this.startDate || !this.endDate) {
      this.visiteursFiltres = [...this.visiteurs];
      return;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    this.visiteursFiltres = this.visiteurs.filter(v => {
      const dateEntree = new Date(v.dateEntree);
      return dateEntree >= start && dateEntree <= end;
    });
  }

  toggleSelection(visiteur: Visiteur) {
    if (this.isSelected(visiteur)) {
      this.selectedVisiteurs = this.selectedVisiteurs.filter(v => v.id !== visiteur.id);
    } else {
      this.selectedVisiteurs.push(visiteur);
    }
  }

  isSelected(visiteur: Visiteur) {
    return this.selectedVisiteurs.some(v => v.id === visiteur.id);
  }

  exporterExcel(exportAll: boolean) {
    this.erreurExport = false;
    const dataToExport = exportAll ? this.visiteursFiltres : this.selectedVisiteurs;

    if (dataToExport.length === 0) {
      this.erreurExport = true;
      return;
    }

    const formattedData = dataToExport.map(v => ({
      Nom: v.nom,
      Prénom: v.prenom,
      CIN: v.cin,
      Téléphone: v.telephone,
      Destination: v.destination,
      "Type Visiteur": v.typeVisiteur || 'Particulier',
      "Date Entrée": v.dateEntree ? new Date(v.dateEntree).toLocaleString() : '',
      "Date Sortie": v.dateSortie ? new Date(v.dateSortie).toLocaleString() : 'Non sorti'
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = { Sheets: { 'Visiteurs': worksheet }, SheetNames: ['Visiteurs'] };
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'visiteurs_export.xlsx');
  }

  resetFiltres() {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedVisiteurs = [];
    this.visiteursFiltres = [...this.visiteurs];
  }

  get visiteursPage(): Visiteur[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.visiteursFiltres.slice(start, start + this.itemsPerPage);
  }

  setPage(page: number) {
    this.currentPage = page;
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/']);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const clickedInside = (event.target as HTMLElement).closest('.relative');
    if (!clickedInside) this.menuOuvert = false;
  }
}
