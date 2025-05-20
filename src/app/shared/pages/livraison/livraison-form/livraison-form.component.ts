import { Component } from '@angular/core';
import { LivraisonService } from 'app/core/services/livraison/livraison.service';

@Component({
  selector: 'app-livraison-form',
  standalone: false,
  templateUrl: './livraison-form.component.html',
  styleUrls: ['./livraison-form.component.css']
})
export class LivraisonFormComponent {

  entreeCamion = {
    numeroChassis: '',
    marque: '',
    modele: '',
    nomChauffeur: '',
    prenomChauffeur: ''
  };

  erreurFormulaire = '';
  modelesDisponibles: string[] = [];

  constructor(private livraisonService: LivraisonService) {}

  onMarqueChange() {
    const marque = this.entreeCamion.marque;

    switch (marque) {
      case 'Renault':
        this.modelesDisponibles = [
          'Renault Trucks D',
          'Renault Trucks K',
          'Renault Trucks C',
          'Renault Trucks T'
        ];
        break;
      case 'Forlend':
        this.modelesDisponibles = [
          'Forland T5e',
          'Forland L5e',
          'Forland L5n',
          'Forland L5'
        ];
        break;
      case 'Kaycenne':
        this.modelesDisponibles = [
          'Kaicene F70',
          'Kaicene F30',
          'Kaicene F300'
        ];
        break;
      default:
        this.modelesDisponibles = [];
    }

    this.entreeCamion.modele = '';
  }

  enregistrerEntree() {
    const { numeroChassis, marque, modele, nomChauffeur, prenomChauffeur } = this.entreeCamion;

    if (!numeroChassis || !marque || !modele || !nomChauffeur || !prenomChauffeur) {
      this.erreurFormulaire = '❌ Veuillez remplir tous les champs avant de valider.';
      return;
    }

    this.erreurFormulaire = '';
    this.livraisonService.enregistrerEntree(this.entreeCamion).subscribe({
      next: () => {
        alert('✅ Camion enregistré avec succès');
        this.resetForm();
      },
      error: () => {
        alert('❌ Erreur lors de l\'enregistrement');
      }
    });
  }

  resetForm() {
    this.entreeCamion = {
      numeroChassis: '',
      marque: '',
      modele: '',
      nomChauffeur: '',
      prenomChauffeur: ''
    };
    this.modelesDisponibles = [];
    this.erreurFormulaire = '';
  }
}
