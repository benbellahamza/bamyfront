import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.getVisiteurs();
  }

  // ✅ Récupération des visiteurs (triés par date d'entrée décroissante)
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

  // ✅ Filtrage par recherche sur nom, prénom ou CIN
  rechercher() {
    const terme = this.searchTerm.toLowerCase();
    this.visiteursFiltres = this.visiteurs.filter(v =>
      v.nom.toLowerCase().includes(terme) ||
      v.prenom.toLowerCase().includes(terme) ||
      v.cin.toLowerCase().includes(terme)
    );
  }

}
