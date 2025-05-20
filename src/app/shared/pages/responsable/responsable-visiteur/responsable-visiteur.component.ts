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
  selector: 'app-responsable-visiteur',
  standalone: false,
  templateUrl: './responsable-visiteur.component.html',
  styleUrls: ['./responsable-visiteur.component.css']
})
export class ResponsableVisiteurComponent implements OnInit {

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

    motDePasseVisible = false;
  confirmationVisible = false;
  confirmationMotDePasse: string = '';

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
    if (!token) {
      this.router.navigate(['/']);
      return;
    }

    try {
      const payload = token.split('.')[1];
      const decodedPayload = atob(payload);
      const decoded = JSON.parse(decodedPayload);

      this.utilisateur = {
        nom: decoded.nom || '',
        prenom: decoded.prenom || '',
        email: decoded.sub || '',
        role: decoded.scope || 'RESPONSABLE'
      };
    } catch (e) {
      console.error('Erreur de décodage du JWT :', e);
      this.logout();
    }
  }

  ouvrirModalePassword() {
    this.modalePasswordVisible = true;
    this.messageErreur = '';
    this.messageSuccess = '';
    this.menuOuvert = false;
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
        this.messageSuccess = res.message || "✅ Mot de passe mis à jour avec succès.";
        this.messageErreur = "";
        this.ancienMotDePasse = '';
        this.nouveauMotDePasse = '';
        setTimeout(() => this.fermerModalePassword(), 3000);
      },
      error: (err) => {
        this.messageErreur = err.error?.error || "❌ Erreur lors de la mise à jour du mot de passe.";
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
      error: (err) => {
        console.error('Erreur lors du chargement des visiteurs', err);
        this.loading = false;
      }
    });
  }

  rechercher() {
  const terme = this.searchTerm.toLowerCase().trim();
  
  if (!terme) {
    this.visiteursFiltres = [...this.visiteurs];
    this.appliquerFiltresDate();
    return;
  }
  
  // Diviser les termes de recherche pour permettre la recherche par nom ET prénom
  const termes = terme.split(' ').filter(t => t.length > 0);
  
  this.visiteursFiltres = this.visiteurs.filter(visiteur => {
    const nomComplet = (visiteur.nom + ' ' + visiteur.prenom).toLowerCase();
    const prenomNom = (visiteur.prenom + ' ' + visiteur.nom).toLowerCase();
    const cin = visiteur.cin.toLowerCase();
    
    // Vérifie si tous les termes de recherche sont présents dans les champs
    return termes.every(t => 
      nomComplet.includes(t) || 
      prenomNom.includes(t) || 
      cin.includes(t)
    );
  });
  
  this.appliquerFiltresDate();
}

  filtrerParDate() {
    if (this.startDate || this.endDate) {
      this.visiteursFiltres = [...this.visiteurs];
      this.appliquerFiltresDate();
      if (this.searchTerm) {
        this.rechercher();
      }
    } else if (this.searchTerm) {
      this.rechercher();
    } else {
      this.visiteursFiltres = [...this.visiteurs];
    }
    this.currentPage = 1;
  }

  appliquerFiltresDate() {
    if (!this.startDate && !this.endDate) return;

    let start = this.startDate ? new Date(this.startDate) : new Date(0);
    let end = this.endDate ? new Date(this.endDate) : new Date();

    if (this.endDate) {
      end.setHours(23, 59, 59, 999);
    }

    this.visiteursFiltres = this.visiteursFiltres.filter(v => {
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

  isSelected(visiteur: Visiteur): boolean {
    return this.selectedVisiteurs.some(v => v.id === visiteur.id);
  }

  exporterExcel(exportAll: boolean) {
    this.erreurExport = false;
    const dataToExport = exportAll ? this.visiteursFiltres : this.selectedVisiteurs;

    if (!exportAll && dataToExport.length === 0) {
      this.erreurExport = true;
      setTimeout(() => this.erreurExport = false, 3000);
      return;
    }

    const formattedData = dataToExport.map(v => ({
      Nom: v.nom,
      Prénom: v.prenom,
      CIN: v.cin,
      Genre: v.genre,
      Téléphone: v.telephone || 'Non renseigné',
      Destination: v.destination,
      "Type Visiteur": v.typeVisiteur || 'Particulier',
      "Date Entrée": v.dateEntree ? new Date(v.dateEntree).toLocaleString() : '',
      "Date Sortie": v.dateSortie ? new Date(v.dateSortie).toLocaleString() : 'Non sorti'
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = { Sheets: { 'Visiteurs': worksheet }, SheetNames: ['Visiteurs'] };
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    const fileName = exportAll
      ? `visiteurs_complet_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `visiteurs_selection_${new Date().toISOString().slice(0, 10)}.xlsx`;

    saveAs(blob, fileName);
  }

  resetFiltres() {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedVisiteurs = [];
    this.visiteursFiltres = [...this.visiteurs];
    this.currentPage = 1;
  }

  get visiteursPage(): Visiteur[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.visiteursFiltres.slice(start, start + this.itemsPerPage);
  }

  setPage(page: number) {
    if (page < 1 || page > this.pages.length) return;
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/']);
  }

  getInitiales(): string {
    return this.utilisateur.nom && this.utilisateur.prenom 
      ? `${this.utilisateur.nom.charAt(0)}${this.utilisateur.prenom.charAt(0)}` 
      : '';
  }

  // Méthodes pour obtenir les statistiques
  getVisiteursSortis(): number {
    if (!this.visiteurs) return 0;
    return this.visiteurs.filter(v => !!v.dateSortie).length;
  }

  getVisiteursPresents(): number {
    if (!this.visiteurs) return 0;
    return this.visiteurs.filter(v => !v.dateSortie).length;
  }

  // Format de date personnalisé pour éviter les erreurs avec le pipe date
  formatDate(dateString: string | undefined, format: string = 'dd/MM/yyyy HH:mm'): string {
    if (!dateString) return 'Non disponible';
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      if (format === 'dd/MM/yyyy HH:mm') {
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      } else {
        return `${day}/${month}/${year}`;
      }
    } catch (e) {
      return 'Erreur de date';
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.relative') || target.closest('.w-10.h-10.rounded-full');
    if (!clickedInside && this.menuOuvert) {
      this.menuOuvert = false;
    }
  }
}