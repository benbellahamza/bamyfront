import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LivraisonService } from 'app/core/services/livraison/livraison.service';
import { Router } from '@angular/router';

// Interface pour le camion
interface Camion {
  numeroChassis: string;
  marque: string;
  modele: string;
  chauffeurEntree?: {
    nom: string;
    prenom: string;
  };
  dateEntree: string;
}

@Component({
  selector: 'app-livraison-form',
  standalone: false,
  templateUrl: './livraison-form.component.html',
  styleUrls: ['./livraison-form.component.css']
})
export class LivraisonFormComponent implements OnInit {
  entreeForm!: FormGroup;
  modelesDisponibles: string[] = [];
  erreurFormulaire = '';
  messageSucces = '';
  loading = false;

  // Nouvelles propriétés pour le design amélioré
  marqueSelectionnee = '';
  modeleSelectionne = '';
  stockActuel = 100;
  modalListeCamionsVisible = false;
  camionsEnStockage: Camion[] = [];

  // Nouvelles propriétés pour l'édition
  camionEnEdition = '';
  camionEditForm = {
    marque: '',
    modele: '',
    nomChauffeur: '',
    prenomChauffeur: ''
  };

  // Données des modèles par marque
  private modelesParMarque: { [key: string]: string[] } = {
    'Renault': ['Renault Trucks D', 'Renault Trucks K', 'Renault Trucks C', 'Renault Trucks T'],
    'Forlend': ['Forland T5e', 'Forland L5e', 'Forland L5n', 'Forland L5'],
    'Kaycenne': ['Kaicene F70', 'Kaicene F30', 'Kaicene F300']
  };

  constructor(
    private fb: FormBuilder,
    private livraisonService: LivraisonService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.chargerStock();
    this.chargerCamionsStockage();
    this.nettoyerCamionsAnciens();
  }

  private initForm(): void {
    this.entreeForm = this.fb.group({
      numeroChassis: ['', Validators.required],
      marque: ['', Validators.required],
      modele: ['', Validators.required],
      nomChauffeur: ['', Validators.required],
      prenomChauffeur: ['', Validators.required]
    });

    // Observer les changements de marque pour synchroniser avec la sélection visuelle
    this.entreeForm.get('marque')?.valueChanges.subscribe((val: string) => {
      this.marqueSelectionnee = val;
      this.modelesDisponibles = this.getModelesParMarque(val);
      this.modeleSelectionne = '';
      this.entreeForm.get('modele')?.setValue('');
    });

    // Observer les changements de modèle
    this.entreeForm.get('modele')?.valueChanges.subscribe((val: string) => {
      this.modeleSelectionne = val;
    });
  }

  // Fonction pour sélectionner une marque (nouvelle interface)
  selectionnerMarque(marque: string): void {
    this.marqueSelectionnee = marque;
    this.entreeForm.get('marque')?.setValue(marque);
    this.modelesDisponibles = this.getModelesParMarque(marque);
    this.modeleSelectionne = '';
    this.entreeForm.get('modele')?.setValue('');
  }

  // Fonction pour sélectionner un modèle (nouvelle interface)
  selectionnerModele(modele: string): void {
    this.modeleSelectionne = modele;
    this.entreeForm.get('modele')?.setValue(modele);
  }

  getModelesParMarque(marque: string): string[] {
    return this.modelesParMarque[marque] || [];
  }

  isFieldInvalid(field: string): boolean {
    const control = this.entreeForm.get(field);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  // Gestion du stock
  private chargerStock(): void {
    const stockSauvegarde = localStorage.getItem('stockActuel');
    if (stockSauvegarde) {
      this.stockActuel = parseInt(stockSauvegarde, 10);
    }
  }

  private mettreAJourStock(changement: number): void {
    this.stockActuel += changement;
    localStorage.setItem('stockActuel', this.stockActuel.toString());
  }

  // Gestion des camions en stockage
  private chargerCamionsStockage(): void {
    const camions = localStorage.getItem('camionsEnStockage');
    if (camions) {
      this.camionsEnStockage = JSON.parse(camions);
    }
  }

  private sauvegarderCamionsStockage(): void {
    localStorage.setItem('camionsEnStockage', JSON.stringify(this.camionsEnStockage));
  }

  // Nettoyer les camions anciens (plus de 24h) pour les agents
  private nettoyerCamionsAnciens(): void {
    const utilisateur = this.getUtilisateurActuel();
    
    // Si c'est un agent, supprimer les camions de plus de 24h
    if (utilisateur.role === 'AGENT') {
      const maintenant = new Date().getTime();
      this.camionsEnStockage = this.camionsEnStockage.filter(camion => {
        const tempsEcoule = maintenant - new Date(camion.dateEntree).getTime();
        return tempsEcoule < 24 * 60 * 60 * 1000; // 24 heures
      });
      this.sauvegarderCamionsStockage();
    }
  }

  // Récupérer les infos utilisateur depuis le token
  private getUtilisateurActuel(): any {
    const token = localStorage.getItem('access-token');
    if (!token) return { role: 'AGENT' };

    try {
      const payload = token.split('.')[1];
      const decodedPayload = atob(payload);
      const decoded = JSON.parse(decodedPayload);
      return {
        nom: decoded.nom || '',
        prenom: decoded.prenom || '',
        email: decoded.sub || '',
        role: decoded.scope || 'AGENT'
      };
    } catch (e) {
      console.error('Erreur de décodage du JWT :', e);
      return { role: 'AGENT' };
    }
  }

  // Vérifier si l'utilisateur peut modifier
  peutModifier(): boolean {
    const utilisateur = this.getUtilisateurActuel();
    return utilisateur.role === 'RESPONSABLE' || utilisateur.role === 'ADMIN';
  }

  // Modal liste des camions
  ouvrirListeCamions(): void {
    this.modalListeCamionsVisible = true;
    this.chargerCamionsStockage();
  }

  fermerListeCamions(): void {
    this.modalListeCamionsVisible = false;
    this.annulerEdition(); // Annuler toute édition en cours
  }

  // Fonctions d'édition des camions
  commencerEdition(camion: Camion): void {
    this.camionEnEdition = camion.numeroChassis;
    this.camionEditForm = {
      marque: camion.marque,
      modele: camion.modele,
      nomChauffeur: camion.chauffeurEntree?.nom || '',
      prenomChauffeur: camion.chauffeurEntree?.prenom || ''
    };
  }

  annulerEdition(): void {
    this.camionEnEdition = '';
    this.camionEditForm = {
      marque: '',
      modele: '',
      nomChauffeur: '',
      prenomChauffeur: ''
    };
  }

  changerMarqueEdition(): void {
    // Réinitialiser le modèle quand on change de marque
    this.camionEditForm.modele = '';
  }

  sauvegarderModification(camion: Camion): void {
    // Validation
    if (!this.camionEditForm.marque || !this.camionEditForm.modele || 
        !this.camionEditForm.nomChauffeur || !this.camionEditForm.prenomChauffeur) {
      this.erreurFormulaire = '❌ Veuillez remplir tous les champs obligatoires.';
      return;
    }

    // Trouver et mettre à jour le camion dans la liste
    const index = this.camionsEnStockage.findIndex(c => c.numeroChassis === camion.numeroChassis);
    if (index !== -1) {
      this.camionsEnStockage[index] = {
        ...this.camionsEnStockage[index],
        marque: this.camionEditForm.marque,
        modele: this.camionEditForm.modele,
        chauffeurEntree: {
          nom: this.camionEditForm.nomChauffeur,
          prenom: this.camionEditForm.prenomChauffeur
        }
      };

      // Sauvegarder dans localStorage
      this.sauvegarderCamionsStockage();

      // Faire l'appel API pour sauvegarder en base de données
      this.livraisonService.modifierCamion(camion.numeroChassis, {
        marque: this.camionEditForm.marque,
        modele: this.camionEditForm.modele,
        nomChauffeur: this.camionEditForm.nomChauffeur,
        prenomChauffeur: this.camionEditForm.prenomChauffeur
      }).subscribe({
        next: () => {
          this.messageSucces = '✅ Camion modifié avec succès !';
          setTimeout(() => this.messageSucces = '', 3000);
        },
        error: (err) => {
          this.erreurFormulaire = `❌ Erreur lors de la modification : ${err.error?.message || 'Une erreur est survenue.'}`;
          setTimeout(() => this.erreurFormulaire = '', 5000);
        }
      });

      this.annulerEdition();
    }
  }

  modifierCamion(camion: Camion): void {
    this.commencerEdition(camion);
  }

  // Validation unique du numéro de châssis
  private chassisExiste(numeroChassis: string): boolean {
    return this.camionsEnStockage.some(camion => camion.numeroChassis === numeroChassis);
  }

  enregistrerEntree(): void {
    if (this.entreeForm.invalid) {
      this.erreurFormulaire = '❌ Veuillez remplir tous les champs obligatoires.';
      Object.keys(this.entreeForm.controls).forEach(key => this.entreeForm.get(key)?.markAsTouched());
      return;
    }

    const numeroChassis = this.entreeForm.get('numeroChassis')?.value;
    
    // Vérifier si le châssis existe déjà
    if (this.chassisExiste(numeroChassis)) {
      this.erreurFormulaire = '❌ Ce numéro de châssis existe déjà dans le système.';
      return;
    }

    this.loading = true;
    const data = {
      ...this.entreeForm.value
    };

    this.livraisonService.enregistrerEntree(data).subscribe({
      next: () => {
        // Ajouter le camion à la liste locale
        const nouveauCamion: Camion = {
          numeroChassis: data.numeroChassis,
          marque: data.marque,
          modele: data.modele,
          chauffeurEntree: {
            nom: data.nomChauffeur,
            prenom: data.prenomChauffeur
          },
          dateEntree: new Date().toISOString()
        };

        this.camionsEnStockage.push(nouveauCamion);
        this.sauvegarderCamionsStockage();

        // Mettre à jour le stock
        this.mettreAJourStock(1);

        this.messageSucces = '✅ Camion enregistré avec succès !';
        this.erreurFormulaire = '';
        this.loading = false;

        setTimeout(() => {
          this.resetForm();
          this.messageSucces = '';
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        this.erreurFormulaire = `❌ Erreur : ${err.error?.message || 'Une erreur est survenue.'}`;
      }
    });
  }

  private resetForm(): void {
    this.entreeForm.reset();
    this.marqueSelectionnee = '';
    this.modeleSelectionne = '';
    this.modelesDisponibles = [];
  }
}