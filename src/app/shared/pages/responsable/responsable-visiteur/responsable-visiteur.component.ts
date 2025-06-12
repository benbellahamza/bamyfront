import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class ResponsableVisiteurComponent implements OnInit, OnDestroy {
  
  // ✅ CONFIGURATION NAVIGATION
  navigationItems = [
    {
      label: 'Dashboard Responsable',
      route: '/responsable/dashboard',
      icon: 'dashboard',
      active: false
    },
    {
      label: 'Liste des visiteurs',
      route: '/responsable/visiteur',
      icon: 'users',
      active: true
    }
  ];

  // ✅ DONNÉES PRINCIPALES
  visiteurs: Visiteur[] = [];
  visiteursFiltres: Visiteur[] = [];
  selectedVisiteurs: Visiteur[] = [];

  // ✅ FILTRES ET RECHERCHE
  searchTerm: string = '';
  startDate: string = '';
  endDate: string = '';
  loading: boolean = false;

  // ✅ PAGINATION
  currentPage: number = 1;
  itemsPerPage: number = 16;

  // ✅ GESTION DES ERREURS
  erreurExport: boolean = false;

  // ✅ UTILITAIRES
  Math = Math;

  // ✅ SUBSCRIPTIONS
  private subscriptions: any[] = [];

  constructor(
    private http: HttpClient, 
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getVisiteurs();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
  }

  // ✅ CALLBACK LAYOUT UNIFIÉ
  onPasswordChanged(): void {
    console.log('Mot de passe changé');
  }

  // ✅ CHARGEMENT DES DONNÉES
  getVisiteurs(): void {
    this.loading = true;
    const subscription = this.http.get<Visiteur[]>('http://localhost:8085/api/visiteurs').subscribe({
      next: (data) => {
        this.visiteurs = data.sort((a, b) => 
          new Date(b.dateEntree).getTime() - new Date(a.dateEntree).getTime()
        );
        this.visiteursFiltres = [...this.visiteurs];
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement visiteurs:', err);
        this.loading = false;
      }
    });
    this.subscriptions.push(subscription);
  }

  // ✅ RECHERCHE
  rechercher(): void {
    this.currentPage = 1;
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

    this.appliquerFiltresDate();
  }

  // ✅ FILTRAGE PAR DATE
  filtrerParDate(): void {
    this.currentPage = 1;
    this.appliquerFiltresDate();
  }

  private appliquerFiltresDate(): void {
    if (!this.startDate || !this.endDate) {
      if (this.searchTerm) {
        this.rechercher();
      } else {
        this.visiteursFiltres = [...this.visiteurs];
      }
      return;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    end.setHours(23, 59, 59, 999);

    const listeBase = this.searchTerm ? this.visiteursFiltres : this.visiteurs;
    
    this.visiteursFiltres = listeBase.filter(v => {
      const dateEntree = new Date(v.dateEntree);
      return dateEntree >= start && dateEntree <= end;
    });
  }

  private appliquerTousFiltres(): void {
    let resultat = [...this.visiteurs];

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

  // ✅ GESTION SÉLECTION
  toggleSelection(visiteur: Visiteur): void {
    if (this.isSelected(visiteur)) {
      this.selectedVisiteurs = this.selectedVisiteurs.filter(v => v.id !== visiteur.id);
    } else {
      this.selectedVisiteurs.push(visiteur);
    }
  }

  isSelected(visiteur: Visiteur): boolean {
    return this.selectedVisiteurs.some(v => v.id === visiteur.id);
  }

  selectionnerTous(): void {
    this.selectedVisiteurs = [...this.visiteursFiltres];
  }

  deselectionnerTous(): void {
    this.selectedVisiteurs = [];
  }

  // ✅ STATISTIQUES
  getVisiteursSortis(): number {
    return this.visiteurs.filter(v => v.dateSortie).length;
  }

  getVisiteursPresents(): number {
    return this.visiteurs.filter(v => !v.dateSortie).length;
  }

  // ✅ EXPORT EXCEL
  exporterExcel(exportAll: boolean): void {
    this.erreurExport = false;
    const dataToExport = exportAll ? this.visiteursFiltres : this.selectedVisiteurs;

    if (dataToExport.length === 0) {
      this.erreurExport = true;
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
      'Statut': v.dateSortie ? 'Sorti' : 'Présent'
    }));

    try {
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      const columnWidths = [
        { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 },
        { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 10 }
      ];
      worksheet['!cols'] = columnWidths;

      const workbook = { 
        Sheets: { 'Visiteurs': worksheet }, 
        SheetNames: ['Visiteurs'] 
      };
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const fileName = `visiteurs_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(blob, fileName);

    } catch (error) {
      console.error('Erreur export:', error);
      this.erreurExport = true;
      setTimeout(() => {
        this.erreurExport = false;
      }, 5000);
    }
  }

  // ✅ RÉINITIALISATION
  resetFiltres(): void {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedVisiteurs = [];
    this.visiteursFiltres = [...this.visiteurs];
    this.currentPage = 1;
    this.erreurExport = false;
  }

  // ✅ PAGINATION
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

  setPage(page: number): void {
    if (page >= 1 && page <= this.pages.length) {
      this.currentPage = page;
    }
  }

  // ✅ FILTRES PRÉDÉFINIS
  filtrerParPeriodePredefinie(periode: 'aujourdhui' | 'hier' | 'semaine' | 'mois'): void {
    const maintenant = new Date();
    let debut: Date;
    let fin: Date = new Date(maintenant);

    switch (periode) {
      case 'aujourdhui':
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

  // ✅ OPTIMISATION PERFORMANCE
  trackByVisiteurId(index: number, visiteur: Visiteur): number {
    return visiteur.id;
  }

  // ✅ FORMAT DE DATE PERSONNALISÉ
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
}