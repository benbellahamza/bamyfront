import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { VisiteurService } from 'app/core/services/visiteur/visiteur.service';

@Component({
  selector: 'app-form',
  standalone: false,
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.css']
})
export class FormComponent implements OnInit {
  visiteurForm!: FormGroup;
  compteur: number = 0;
  currentTime: string = '';
  currentDayName: string = ''; // ✅ MODIFIÉ pour la date complète
  currentFullDate: string = ''; // ✅ AJOUTÉ pour la date complète
  confirmationMessage = '';
  loading = false;
  selectedVisiteurId: number | null = null;

  utilisateur = {
    nom: '',
    prenom: '',
    email: '',
    role: ''
  };
  menuOuvert = false;

  modalePasswordVisible = false;
  ancienMotDePasse = '';
  nouveauMotDePasse = '';
  messageErreur = '';
  messageSuccess = '';

  constructor(
    private fb: FormBuilder,
    private visiteurService: VisiteurService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.decodeToken();
    this.createForm();
    this.loadCompteur();
    this.startClock();

    // Écouter l'événement d'édition de visiteur
    window.addEventListener('edit-visiteur', (e: any) => {
      const visiteur = e.detail;
      this.selectedVisiteurId = visiteur.id;

      this.visiteurForm.patchValue({
        nom: visiteur.nom,
        prenom: visiteur.prenom,
        cin: visiteur.cin,
        genre: visiteur.genre,
        destination: visiteur.destination,
        typeVisiteur: visiteur.typeVisiteur,
        telephone: visiteur.telephone,
        matricule: visiteur.matricule
      });
    });
  }

  decodeToken() {
    const token = localStorage.getItem('access-token');
    if (!token) return;

    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));

      this.utilisateur = {
        nom: decoded.nom || '',
        prenom: decoded.prenom || '',
        email: decoded.sub || '',
        role: decoded.scope || ''
      };
    } catch (e) {
      console.error('❌ Erreur de décodage JWT', e);
    }
  }

  createForm() {
    this.visiteurForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      cin: ['', [Validators.required, Validators.minLength(5)]],
      genre: ['', Validators.required],
      destination: ['', Validators.required],
      typeVisiteur: [''],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9\s\-\+\(\)]{10,}$/)]],
      matricule: [''] // Sera géré dynamiquement selon la destination
    });

    // ✅ MODIFIÉ : Surveillance des changements de destination (matricule optionnel)
    this.visiteurForm.get('destination')?.valueChanges.subscribe(destination => {
      const matriculeControl = this.visiteurForm.get('matricule');
      
      if (destination === 'atelier') {
        // ✅ CHANGÉ : Matricule optionnel pour l'atelier (pas de validation obligatoire)
        matriculeControl?.clearValidators();
      } else {
        // Supprimer la validation et vider le champ pour les autres destinations
        matriculeControl?.clearValidators();
        matriculeControl?.setValue('');
      }
      matriculeControl?.updateValueAndValidity();
    });
  }

  startClock() {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
  }

  updateTime() {
    const now = new Date();
    // ✅ CORRIGÉ : Format de l'heure pour correspondre au template
    this.currentTime = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    // ✅ MODIFIÉ : Date complète avec jour, date, mois et année
    this.currentFullDate = now.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    
    // Capitaliser la première lettre
    this.currentFullDate = this.currentFullDate.charAt(0).toUpperCase() + this.currentFullDate.slice(1);
  }

  loadCompteur() {
    this.http.get<number>('http://localhost:8085/api/compteur').subscribe({
      next: (data) => this.compteur = data,
      error: (err) => {
        console.error('Erreur chargement compteur', err);
        this.compteur = 0;
      }
    });
  }

  onSubmit() {
    // ✅ AMÉLIORÉ : Validation et marquage des champs touchés
    if (this.visiteurForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;

    const serviceCall = this.selectedVisiteurId !== null
      ? this.visiteurService.modifierVisiteur(this.selectedVisiteurId, this.visiteurForm.value)
      : this.visiteurService.ajouterVisiteur(this.visiteurForm.value);

    serviceCall.subscribe({
      next: () => {
        const message = this.selectedVisiteurId !== null 
          ? 'Visiteur modifié avec succès !' 
          : 'Visiteur enregistré avec succès !';
        this.showMessage(message);
      },
      error: (err) => {
        console.error('Erreur soumission', err);
        this.loading = false;
        this.confirmationMessage = 'Erreur lors de la soumission. Veuillez réessayer.';
        
        // Effacer le message d'erreur après 5 secondes
        setTimeout(() => this.confirmationMessage = '', 5000);
      }
    });
  }

  // ✅ AJOUTÉ : Méthode pour marquer tous les champs comme touchés
  private markFormGroupTouched(): void {
    Object.keys(this.visiteurForm.controls).forEach(key => {
      this.visiteurForm.get(key)?.markAsTouched();
    });
  }

  showMessage(message: string) {
    this.confirmationMessage = message;
    this.resetForm(); // ✅ Utiliser une méthode dédiée
    this.loading = false;
    this.loadCompteur();

    // Effacer le message après 5 secondes (au lieu de 3)
    setTimeout(() => this.confirmationMessage = '', 5000);
    window.dispatchEvent(new CustomEvent('refresh-visiteurs'));
  }

  // ✅ MODIFIÉ : Méthode pour réinitialiser le formulaire proprement
  resetForm(): void {
    this.visiteurForm.reset();
    this.selectedVisiteurId = null;
    
    // ✅ CHANGÉ : Réinitialiser sans validation obligatoire
    const matriculeControl = this.visiteurForm.get('matricule');
    matriculeControl?.clearValidators();
    matriculeControl?.updateValueAndValidity();
  }

  validerSortie(id: number) {
    this.visiteurService.validerSortie(id).subscribe({
      next: () => {
        window.dispatchEvent(new CustomEvent('refresh-visiteurs'));
        this.loadCompteur(); // Mettre à jour le compteur
      },
      error: (err) => console.error('Erreur validation sortie', err)
    });
  }

  supprimerVisiteur(id: number) {
    if (confirm("Voulez-vous vraiment supprimer ce visiteur ?")) {
      this.visiteurService.supprimer(id).subscribe({
        next: () => {
          this.loadCompteur();
          window.dispatchEvent(new CustomEvent('refresh-visiteurs'));
        },
        error: (err) => console.error('Erreur suppression', err)
      });
    }
  }

  toggleMenu() {
    this.menuOuvert = !this.menuOuvert;
  }

  logout() {
    localStorage.clear();
    window.location.href = '/';
  }

  ouvrirModalePassword() {
    this.ancienMotDePasse = '';
    this.nouveauMotDePasse = '';
    this.messageErreur = '';
    this.messageSuccess = '';
    this.modalePasswordVisible = true;
  }

  fermerModalePassword() {
    this.modalePasswordVisible = false;
  }

  changerMotDePasse() {
    const payload = {
      ancienPassword: this.ancienMotDePasse,
      nouveauPassword: this.nouveauMotDePasse
    };

    this.http.post('http://localhost:8085/auth/update-password', payload).subscribe({
      next: () => {
        this.messageSuccess = "Mot de passe modifié avec succès.";
        this.messageErreur = "";
      },
      error: () => {
        this.messageErreur = "Ancien mot de passe incorrect.";
        this.messageSuccess = "";
      }
    });
  }

  // ✅ AJOUTÉ : Pipe titlecase personnalisé (si pas disponible dans votre module)
  titlecase(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}