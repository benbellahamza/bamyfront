import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LivraisonService } from 'app/core/services/livraison/livraison.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-livraison-form',
  standalone:false,
  templateUrl: './livraison-form.component.html',
  styleUrls: ['./livraison-form.component.css']
})
export class LivraisonFormComponent implements OnInit {
  entreeForm!: FormGroup;
  modelesDisponibles: string[] = [];
  erreurFormulaire = '';
  messageSucces = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private livraisonService: LivraisonService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.entreeForm = this.fb.group({
      numeroChassis: ['', Validators.required],
      marque: ['', Validators.required],
      modele: ['', Validators.required],
      nomChauffeur: ['', Validators.required],
      prenomChauffeur: ['', Validators.required]
    });

    this.entreeForm.get('marque')?.valueChanges.subscribe((val: string) => {
      this.modelesDisponibles = this.getModelesParMarque(val);
      this.entreeForm.get('modele')?.setValue('');
    });
  }

  getModelesParMarque(marque: string): string[] {
    switch (marque) {
      case 'Renault':
        return ['Renault Trucks D', 'Renault Trucks K', 'Renault Trucks C', 'Renault Trucks T'];
      case 'Forlend':
        return ['Forland T5e', 'Forland L5e', 'Forland L5n', 'Forland L5'];
      case 'Kaycenne':
        return ['Kaicene F70', 'Kaicene F30', 'Kaicene F300'];
      default:
        return [];
    }
  }

  isFieldInvalid(field: string): boolean {
    const control = this.entreeForm.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  enregistrerEntree(): void {
    if (this.entreeForm.invalid) {
      this.erreurFormulaire = '❌ Veuillez remplir tous les champs obligatoires.';
      Object.keys(this.entreeForm.controls).forEach(key => this.entreeForm.get(key)?.markAsTouched());
      return;
    }

    this.loading = true;
    const data = {
      ...this.entreeForm.value
    };

    this.livraisonService.enregistrerEntree(data).subscribe({
      next: () => {
        this.messageSucces = '✅ Camion enregistré avec succès !';
        this.erreurFormulaire = '';
        this.loading = false;

        setTimeout(() => {
          this.entreeForm.reset();
          this.messageSucces = '';
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        this.erreurFormulaire = `❌ Erreur : ${err.error?.message || 'Une erreur est survenue.'}`;
      }
    });
  }
}
