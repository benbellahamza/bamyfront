import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LivraisonService } from 'app/core/services/livraison/livraison.service';

interface Camion {
  numeroChassis: string;
  marque: string;
  modele: string;
  nomChauffeur: string;
  prenomChauffeur: string;
  dateEntree?: string;
  dateSortie?: string;
  destination?: string;
  statut?: string;
  dateEntreeFormatee?: string;
  dateSortieFormatee?: string;
}

@Component({
  selector: 'app-admin-livraison',
  standalone: false,
  templateUrl: './admin-livraison.component.html',
  styleUrls: ['./admin-livraison.component.css']
})
export class AdminLivraisonComponent implements OnInit {
  camions: Camion[] = [];
  camionsFiltres: Camion[] = [];
  filtreStatut = 'TOUS';

  constructor(private livraisonService: LivraisonService, private http: HttpClient) {}

  ngOnInit(): void {
    this.chargerCamions();
  }
  chargerCamions(): void {
    this.livraisonService.getCamions().subscribe({
      next: (data: Camion[]) => {
        this.camions = data.map(c => ({
          ...c,
          dateEntreeFormatee: c.dateEntree ? new Date(c.dateEntree).toLocaleString() : '',
          dateSortieFormatee: c.dateSortie ? new Date(c.dateSortie).toLocaleString() : ''
        }));
        this.filtrerParStatut(this.filtreStatut);
      },
      error: (err: any) => console.error('Erreur chargement camions', err)
    });
  }

  filtrerParStatut(statut: string): void {
    this.filtreStatut = statut;
    switch (statut) {
      case 'ENTREE':
        this.camionsFiltres = this.camions.filter(c => c.dateEntree && !c.dateSortie);
        break;
      case 'SORTIE':
        this.camionsFiltres = this.camions.filter(c => c.dateSortie);
        break;
      default:
        this.camionsFiltres = [...this.camions];
    }
  }

  getCamionsByStatut(statut: 'ENTREE' | 'SORTIE'): Camion[] {
    return statut === 'ENTREE'
      ? this.camions.filter(c => c.dateEntree && !c.dateSortie)
      : this.camions.filter(c => c.dateSortie);
  }

  enregistrerSortie(camion: Camion): void {
    if (!camion.numeroChassis) return;
    const payload = { dateSortie: new Date().toISOString() };
    this.livraisonService.enregistrerSortie(camion.numeroChassis, payload).subscribe({
      next: () => this.chargerCamions(),
      error: (err: any) => console.error('Erreur lors de la sortie', err)
    });
  }

  naviguerVersAjout(): void {
    // Tu peux rediriger l’admin ici vers une page d’ajout si besoin
  }
}
