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
  loading = false;
  searchTerm: string = '';

  // 🔥 Nouveaux champs nécessaires
  selectedVisiteurs: any[] = [];
  startDate: string = '';
  endDate: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.getVisiteurs();
  }

  // ✅ Charger tous les visiteurs (tri décroissant date d'entrée)
  getVisiteurs() {
    this.loading = true;
    this.http.get<any[]>('http://localhost:8085/api/visiteurs').subscribe({
      next: (data) => {
        this.visiteurs = data.sort((a, b) => new Date(b.dateEntree).getTime() - new Date(a.dateEntree).getTime());
        this.visiteursFiltres = [...this.visiteurs];
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur chargement visiteurs', error);
        this.loading = false;
      }
    });
  }

  // ✅ Recherche dynamique par nom, prénom ou CIN
  rechercher() {
    const terme = this.searchTerm.toLowerCase();
    this.visiteursFiltres = this.visiteurs.filter(v =>
      v.nom.toLowerCase().includes(terme) ||
      v.prenom.toLowerCase().includes(terme) ||
      v.cin.toLowerCase().includes(terme)
    );
  }

  // ✅ Sélectionner / désélectionner un visiteur
  toggleSelection(visiteur: any) {
    if (this.isSelected(visiteur)) {
      this.selectedVisiteurs = this.selectedVisiteurs.filter(v => v.id !== visiteur.id);
    } else {
      this.selectedVisiteurs.push(visiteur);
    }
  }

  isSelected(visiteur: any) {
    return this.selectedVisiteurs.some(v => v.id === visiteur.id);
  }

  // ✅ Exporter en Excel
  exporterExcel(tous: boolean) {
    const dataToExport = tous ? this.visiteursFiltres : this.selectedVisiteurs;

    const formattedData = dataToExport.map(v => ({
      Nom: v.nom,
      Prénom: v.prenom,
      CIN: v.cin,
      Téléphone: v.telephone,
      Destination: v.destination,
      "Type Visiteur": v.typeVisiteur,
      "Date Entrée": v.dateEntree ? new Date(v.dateEntree).toLocaleString() : '',
      "Date Sortie": v.dateSortie ? new Date(v.dateSortie).toLocaleString() : 'Non sorti'
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const file = new Blob([excelBuffer], { type: 'application/octet-stream' });

    // 📂 Téléchargement avec nom dynamique
    const now = new Date();
    const fileName = `visiteurs-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}.xlsx`;
    saveAs(file, fileName);
  }

  // ✅ Filtrer par intervalle de dates
  filtrerParDate() {
    if (!this.startDate || !this.endDate) {
      this.visiteursFiltres = [...this.visiteurs];
      return;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    end.setHours(23, 59, 59, 999); // inclure toute la journée fin

    this.visiteursFiltres = this.visiteurs.filter(v => {
      const dateEntree = new Date(v.dateEntree);
      return dateEntree >= start && dateEntree <= end;
    });
  }

  // ✅ Réinitialiser tous les filtres
  resetFiltres() {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.selectedVisiteurs = [];
    this.visiteursFiltres = [...this.visiteurs];
  }

}
