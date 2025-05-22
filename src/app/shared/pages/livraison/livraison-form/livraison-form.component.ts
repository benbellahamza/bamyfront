import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LivraisonService } from 'app/core/services/livraison/livraison.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-livraison-form',
  standalone: false,
  templateUrl: './livraison-form.component.html',
  styleUrls: ['./livraison-form.component.css']
})
export class LivraisonFormComponent implements OnInit {
  @Output() nouvelleEntree = new EventEmitter<any>();
  
  entreeForm!: FormGroup;
  erreurFormulaire = '';
  messageSucces = '';
  modelesDisponibles: string[] = [];
  loading = false;

  constructor(
    private fb: FormBuilder,
    private livraisonService: LivraisonService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.entreeForm = this.fb.group({
      numeroChassis: ['', [Validators.required]],
      marque: ['', [Validators.required]],
      modele: ['', [Validators.required]],
      nomChauffeur: ['', [Validators.required]],
      prenomChauffeur: ['', [Validators.required]]
    });

    // Écoute les changements sur le champ marque
    this.entreeForm.get('marque')?.valueChanges.subscribe(marque => {
      this.onMarqueChange(marque);
    });
  }

  onMarqueChange(marque: string): void {
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

    // Reset le modèle quand la marque change
    this.entreeForm.get('modele')?.setValue('');
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.entreeForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  enregistrerEntree(): void {
    if (this.entreeForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.entreeForm.controls).forEach(key => {
        this.entreeForm.get(key)?.markAsTouched();
      });
      this.erreurFormulaire = '❌ Veuillez remplir correctement tous les champs avant de valider.';
      return;
    }

    this.loading = true;
    this.erreurFormulaire = '';
    this.messageSucces = '';

    const entreeData = {
      ...this.entreeForm.value,
      statut: 'ENTREE',
      dateEntree: new Date().toISOString() // Utilise la date du système automatiquement
    };

    this.livraisonService.enregistrerEntree(entreeData).subscribe({
      next: (response) => {
        this.loading = false;
        this.messageSucces = '✅ Camion enregistré avec succès!';
        this.nouvelleEntree.emit(response); // Émet l'événement avec les données du nouveau camion
        
        // Stockage temporaire pour les tests
        this.sauvegarderPourAffichage(response);
        
        // Réinitialiser le formulaire après un délai
        setTimeout(() => {
          this.resetForm();
          this.messageSucces = '';
          
          // Naviguer vers la page d'affichage des livraisons
          this.router.navigate(['/responsable/livraison']);
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        this.erreurFormulaire = `❌ Erreur lors de l'enregistrement: ${err.message || 'Veuillez réessayer'}`;
      }
    });
  }

  // Méthode pour stocker temporairement le camion enregistré (pour le test)
  sauvegarderPourAffichage(camion: any): void {
    // Stocke le camion dans localStorage pour qu'il soit accessible dans le composant de la liste
    let camionsEnregistres = JSON.parse(localStorage.getItem('camionsEnregistres') || '[]');
    camionsEnregistres.push({
      ...camion,
      dateEntreeFormatee: new Date().toLocaleString() // Format lisible pour l'affichage
    });
    localStorage.setItem('camionsEnregistres', JSON.stringify(camionsEnregistres));
  }

  resetForm(): void {
    this.entreeForm.reset();
    this.modelesDisponibles = [];
    this.erreurFormulaire = '';
  }
}