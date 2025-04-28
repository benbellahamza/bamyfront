import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-responsable-visiteur',
  standalone: false,
  templateUrl: './responsable-visiteur.component.html',
  styleUrls: ['./responsable-visiteur.component.css']
})
export class ResponsableVisiteurComponent implements OnInit {

  visiteurs: any[] = [];
  visiteursFiltres: any[] = [];
  selectedVisiteurs: any[] = [];

  searchTerm: string = '';
  startDate: string = '';
  endDate: string = '';

  loading: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.getVisiteurs();
  }

  // 🔵 Charger les visiteurs
  getVisiteurs() {
    this.loading = true;
    this.http.get<any[]>('http://localhost:8085/api/visiteurs').subscribe({
      next: (data) => {
        // Tri décroissant par date d'entrée
        this.visiteurs = data.sort((a, b) => new Date(b.dateEntree).getTime() - new Date(a.dateEntree).getTime());
        this.visiteursFiltres = [...this.visiteurs];
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des visiteurs', error);
        this.loading = false;
      }
    });
  }

  // 🔵 Recherche dynamique
  rechercher() {
    const terme = this.searchTerm.toLowerCase();
    this.visiteursFiltres = this.visiteurs.filter(v =>
      v.nom.toLowerCase().includes(terme) ||
      v.prenom.toLowerCase().includes(terme) ||
      v.cin.toLowerCase().includes(terme)
    );
  }

  // 🔵 Filtrer par dates
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

  // 🔵 Sélectionner / désélectionner un visiteur
  toggleSelection(visiteur: any) {
    if (this.isSelected(visiteur)) {
      this.selectedVisiteurs = this.selectedVisiteurs.filter(v => v.id !== visiteur.id);
    } else {
      this.selectedVisiteurs.push(visiteur);
    }
  }

  // 🔵 Vérifier si visiteur est sélectionné
  isSelected(visiteur: any) {
    return this.selectedVisiteurs.some(v => v.id === visiteur.id);
  }

  // 🔵 Exporter Excel
  exporterExcel(exportAll: boolean) {
    const dataToExport = exportAll ? this.visiteursFiltres : this.selectedVisiteurs;

    if (dataToExport.length === 0) {
      alert('Aucun visiteur sélectionné pour l\'exportation.');
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

  // 🔵 Réinitialiser tous les filtres
  resetFiltres() {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedVisiteurs = [];
    this.visiteursFiltres = [...this.visiteurs];
  }
}
