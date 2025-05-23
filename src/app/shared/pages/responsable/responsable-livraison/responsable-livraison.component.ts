import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface Camion {
  id: number;
  marque: string;
  modele: string;
  numeroChassis: string;
  nomChauffeur: string;
  prenomChauffeur: string;
  dateEntree: string;
  dateSortie?: string;
  destination?: string;
  statut?: 'ENTREE' | 'SORTIE';
  dateEntreeFormatee?: string;
  dateSortieFormatee?: string;
}

@Component({
  selector: 'app-responsable-livraison',
  standalone:false,
  templateUrl: './responsable-livraison.component.html',
  styleUrls: ['./responsable-livraison.component.css']
})
export class ResponsableLivraisonComponent implements OnInit {
  camions: Camion[] = [];
  camionsFiltres: Camion[] = [];
  filtreStatut: 'TOUS' | 'ENTREE' | 'SORTIE' = 'TOUS';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.chargerCamions();
  }

  chargerCamions(): void {
    this.http.get<Camion[]>('http://localhost:8085/api/livraison/all').subscribe({
      next: (data) => {
        this.camions = data.map(camion => ({
          ...camion,
          statut: camion.dateSortie ? 'SORTIE' : 'ENTREE',
          dateEntreeFormatee: this.formatDate(camion.dateEntree),
          dateSortieFormatee: camion.dateSortie ? this.formatDate(camion.dateSortie) : ''
        }));
        this.appliquerFiltre();
      },
      error: (err) => console.error('Erreur chargement camions', err)
    });
  }

  appliquerFiltre(): void {
    if (this.filtreStatut === 'TOUS') {
      this.camionsFiltres = this.camions;
    } else {
      this.camionsFiltres = this.camions.filter(c => c.statut === this.filtreStatut);
    }
  }

  getCamionsByStatut(statut: 'ENTREE' | 'SORTIE'): Camion[] {
    return this.camions.filter(c => c.statut === statut);
  }

  filtrerParStatut(statut: 'TOUS' | 'ENTREE' | 'SORTIE') {
    this.filtreStatut = statut;
    this.appliquerFiltre();
  }

  enregistrerSortie(camion: Camion): void {
    const payload = {
      nomChauffeurSortie: camion.nomChauffeur,
      prenomChauffeurSortie: camion.prenomChauffeur,
      cinChauffeurSortie: 'CIN_PLACEHOLDER' // à récupérer ou ajouter dans le formulaire
    };

    this.http.post(`http://localhost:8085/api/livraison/sortie/${camion.numeroChassis}`, payload).subscribe({
      next: () => this.chargerCamions(),
      error: (err) => console.error('Erreur lors de la sortie du camion', err)
    });
  }

  naviguerVersAjout(): void {
    window.location.href = '/agent/ajouterLivraison';
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
