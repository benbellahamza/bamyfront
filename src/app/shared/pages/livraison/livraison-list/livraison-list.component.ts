import { Component } from '@angular/core';
import { LivraisonService } from 'app/core/services/livraison/livraison.service';

@Component({
  selector: 'app-livraison-list',
  standalone: false,
  templateUrl: './livraison-list.component.html',
  styleUrls: ['./livraison-list.component.css']
})
export class LivraisonListComponent {

  numeroRecherche = '';
  camionTrouve: any = null;

  sortieCamion = {
    destination: '',
    nomChauffeurSortie: '',
    prenomChauffeurSortie: '',
    cinChauffeurSortie: '',
    entreprise: ''
  };

  constructor(private livraisonService: LivraisonService) {}

  rechercherCamion() {
    this.livraisonService.rechercherCamion(this.numeroRecherche).subscribe({
      next: data => this.camionTrouve = data,
      error: () => {
        this.camionTrouve = null;
        alert('🚫 Camion non trouvé');
      }
    });
  }

  enregistrerSortie() {
    this.livraisonService.enregistrerSortie(this.numeroRecherche, this.sortieCamion).subscribe({
      next: () => {
        alert('✅ Sortie enregistrée avec succès');
        this.resetForm();
      },
      error: () => alert('❌ Erreur lors de l\'enregistrement de la sortie')
    });
  }

  resetForm() {
    this.sortieCamion = {
      destination: '',
      nomChauffeurSortie: '',
      prenomChauffeurSortie: '',
      cinChauffeurSortie: '',
      entreprise: ''
    };
    this.numeroRecherche = '';
    this.camionTrouve = null;
  }
}
