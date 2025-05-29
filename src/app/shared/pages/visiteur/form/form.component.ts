import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { VisiteurService } from 'app/core/services/visiteur/visiteur.service';
import { Subject, debounceTime, takeUntil } from 'rxjs';

@Component({
  selector: 'app-form',
  standalone: false,
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.css']
})
export class FormComponent implements OnInit, OnDestroy {
  // 🎯 Propriétés principales
  visiteurForm!: FormGroup;
  selectedVisiteurId: number | null = null;
  loading = false;
  
  // 📊 Données d'affichage
  compteur: number = 0;
  currentTime: string = '';
  currentFullDate: string = '';
  
  // 💬 Messages et états
  confirmationMessage = '';
  messageType: 'success' | 'error' | 'warning' = 'success';
  showMessage = false;
  
  // 📈 Progression du formulaire
  formProgress = 0;
  totalSteps = 5; // Nombre d'étapes dans le formulaire
  
  // 🎨 États visuels
  fieldStates: { [key: string]: 'default' | 'valid' | 'invalid' } = {};
  
  // 🔄 Validation en temps réel
  private destroy$ = new Subject<void>();
  private validationDebounce$ = new Subject<string>();
  
  // 👤 Utilisateur connecté
  utilisateur = {
    nom: '',
    prenom: '',
    email: '',
    role: ''
  };
  
  // 🎛️ Interface utilisateur
  menuOuvert = false;
  modalePasswordVisible = false;
  ancienMotDePasse = '';
  nouveauMotDePasse = '';
  messageErreur = '';
  messageSuccess = '';

  constructor(
    private fb: FormBuilder,
    private visiteurService: VisiteurService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.setupEventListeners();
    this.setupValidationDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 🚀 Initialisation du composant
  private initializeComponent(): void {
    this.decodeToken();
    this.createForm();
    this.loadCompteur();
    this.startClock();
  }

  // 🎧 Configuration des écouteurs d'événements
  private setupEventListeners(): void {
    // Écouter l'événement d'édition de visiteur
    window.addEventListener('edit-visiteur', (e: any) => {
      this.handleEditVisiteur(e.detail);
    });

    // Écouter les changements de fenêtre pour la validation
    window.addEventListener('beforeunload', () => {
      if (this.visiteurForm.dirty && !this.confirmationMessage) {
        return 'Des modifications non sauvegardées seront perdues.';
      }
      return null;
    });
  }

  // ⚡ Configuration de la validation avec debounce
  private setupValidationDebounce(): void {
    this.validationDebounce$
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(fieldName => {
        this.validateField(fieldName);
      });
  }

  // 🔐 Décodage du token JWT
  decodeToken(): void {
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
      this.showNotification('Erreur d\'authentification', 'error');
    }
  }

  // 📝 Création du formulaire avec validation avancée
  createForm(): void {
    this.visiteurForm = this.fb.group({
      nom: ['', [
        Validators.required, 
        Validators.minLength(2),
        Validators.maxLength(50),
        this.noSpecialCharactersValidator
      ]],
      prenom: ['', [
        Validators.required, 
        Validators.minLength(2),
        Validators.maxLength(50),
        this.noSpecialCharactersValidator
      ]],
      cin: ['', [
        Validators.required, 
        Validators.minLength(5),
        Validators.maxLength(12),
        this.cinValidator // Validateur CIN modifié
      ]],
      genre: ['', Validators.required],
      destination: ['', Validators.required],
      typeVisiteur: [''],
      telephone: ['', [
        Validators.required, 
        this.phoneValidator
      ]],
      matricule: ['']
    });

    this.setupDynamicValidation();
    this.initializeFieldStates();
  }

  // 🎯 Configuration de la validation dynamique
  private setupDynamicValidation(): void {
    // Surveillance des changements de destination pour le matricule
    this.visiteurForm.get('destination')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(destination => {
        const matriculeControl = this.visiteurForm.get('matricule');
        
        if (destination === 'atelier') {
          // Matricule optionnel pour l'atelier
          matriculeControl?.clearValidators();
          matriculeControl?.setValidators([Validators.pattern(/^[A-Z0-9]{3,10}$/)]);
        } else {
          matriculeControl?.clearValidators();
          matriculeControl?.setValue('');
        }
        matriculeControl?.updateValueAndValidity();
        this.updateProgress();
      });

    // Surveillance de tous les champs pour la progression
    Object.keys(this.visiteurForm.controls).forEach(key => {
      this.visiteurForm.get(key)?.valueChanges
        .pipe(
          debounceTime(100),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.validationDebounce$.next(key);
          this.updateProgress();
        });
    });
  }

  // 🎨 Initialisation des états visuels des champs
  private initializeFieldStates(): void {
    Object.keys(this.visiteurForm.controls).forEach(key => {
      this.fieldStates[key] = 'default';
    });
  }

  // ✅ Validation en temps réel d'un champ
  private validateField(fieldName: string): void {
    const control = this.visiteurForm.get(fieldName);
    if (!control) return;

    if (control.valid && control.value) {
      this.fieldStates[fieldName] = 'valid';
    } else if (control.invalid && control.touched) {
      this.fieldStates[fieldName] = 'invalid';
    } else {
      this.fieldStates[fieldName] = 'default';
    }

    this.cdr.detectChanges();
  }

  // 📊 Mise à jour de la progression du formulaire
  private updateProgress(): void {
    const controls = this.visiteurForm.controls;
    const requiredFields = ['nom', 'prenom', 'cin', 'genre', 'destination', 'telephone'];
    
    let filledFields = 0;
    requiredFields.forEach(field => {
      if (controls[field]?.value && controls[field]?.valid) {
        filledFields++;
      }
    });

    this.formProgress = Math.round((filledFields / requiredFields.length) * 100);
  }

  // 🕒 Gestion de l'horloge
  startClock(): void {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
  }

  private updateTime(): void {
    const now = new Date();
    
    this.currentTime = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    this.currentFullDate = now.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    
    this.currentFullDate = this.currentFullDate.charAt(0).toUpperCase() + this.currentFullDate.slice(1);
  }

  // 📈 Chargement du compteur avec gestion d'erreur
  loadCompteur(): void {
    this.http.get<number>('http://localhost:8085/api/compteur').subscribe({
      next: (data) => {
        this.compteur = data;
        this.animateCounter();
      },
      error: (err) => {
        console.error('Erreur chargement compteur', err);
        this.compteur = 0;
        this.showNotification('Impossible de charger le compteur', 'warning');
      }
    });
  }

  // 🎬 Animation du compteur
  private animateCounter(): void {
    // Animation simple pour le compteur
    const element = document.querySelector('[data-counter]');
    if (element) {
      element.classList.add('animate-pulse');
      setTimeout(() => element.classList.remove('animate-pulse'), 1000);
    }
  }

  // 🎛️ Gestion de l'édition d'un visiteur
  private handleEditVisiteur(visiteur: any): void {
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

    // Marquer le formulaire comme non modifié après le patch
    this.visiteurForm.markAsPristine();
    this.updateProgress();
  }

  // 📤 Soumission du formulaire avec validation complète
  onSubmit(): void {
    // Validation finale avant soumission
    if (this.visiteurForm.invalid) {
      this.markAllFieldsAsTouched();
      this.showNotification('Veuillez corriger les erreurs dans le formulaire', 'error');
      this.scrollToFirstError();
      return;
    }

    this.loading = true;
    this.showNotification('Enregistrement en cours...', 'warning');

    const formData = this.prepareFormData();
    const serviceCall = this.selectedVisiteurId !== null
      ? this.visiteurService.modifierVisiteur(this.selectedVisiteurId, formData)
      : this.visiteurService.ajouterVisiteur(formData);

    serviceCall.subscribe({
      next: (response) => {
        const message = this.selectedVisiteurId !== null 
          ? 'Visiteur modifié avec succès !' 
          : 'Visiteur enregistré avec succès !';
        
        this.handleSubmitSuccess(message);
      },
      error: (err) => {
        console.error('Erreur soumission', err);
        this.handleSubmitError(err);
      }
    });
  }

  // 🗃️ Préparation des données du formulaire
  private prepareFormData(): any {
    const formValue = { ...this.visiteurForm.value };
    
    // Normalisation des données
    formValue.nom = formValue.nom?.trim().toUpperCase();
    formValue.prenom = formValue.prenom?.trim();
    formValue.cin = formValue.cin?.trim().toUpperCase();
    formValue.telephone = formValue.telephone?.replace(/\s/g, '');
    
    return formValue;
  }

  // ✅ Gestion du succès de soumission
  private handleSubmitSuccess(message: string): void {
    this.showNotification(message, 'success');
    this.resetForm();
    this.loading = false;
    this.loadCompteur();
    this.refreshVisiteursList();
    
    // Animation de succès
    this.animateSuccessSubmit();
  }

  // ❌ Gestion des erreurs de soumission
  private handleSubmitError(error: any): void {
    this.loading = false;
    
    let errorMessage = 'Erreur lors de la soumission. Veuillez réessayer.';
    
    if (error.status === 400) {
      errorMessage = 'Données invalides. Vérifiez vos informations.';
    } else if (error.status === 409) {
      errorMessage = 'Ce visiteur existe déjà (CIN déjà utilisé).';
    } else if (error.status === 500) {
      errorMessage = 'Erreur serveur. Contactez l\'administrateur.';
    }
    
    this.showNotification(errorMessage, 'error');
  }

  // 🎬 Animation de succès
  private animateSuccessSubmit(): void {
    const form = document.querySelector('form');
    if (form) {
      form.classList.add('animate-pulse');
      setTimeout(() => form.classList.remove('animate-pulse'), 500);
    }
  }

  // 🔄 Réinitialisation du formulaire
  resetForm(): void {
    this.visiteurForm.reset();
    this.selectedVisiteurId = null;
    this.initializeFieldStates();
    this.formProgress = 0;
    
    // Réinitialisation des validateurs
    const matriculeControl = this.visiteurForm.get('matricule');
    matriculeControl?.clearValidators();
    matriculeControl?.updateValueAndValidity();
  }

  // 🎯 Marquer tous les champs comme touchés
  private markAllFieldsAsTouched(): void {
    Object.keys(this.visiteurForm.controls).forEach(key => {
      const control = this.visiteurForm.get(key);
      control?.markAsTouched();
      this.validateField(key);
    });
  }

  // 📜 Défiler vers la première erreur
  private scrollToFirstError(): void {
    const firstErrorElement = document.querySelector('.field-error, .border-red-500');
    if (firstErrorElement) {
      firstErrorElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }

  // 📢 Affichage des notifications
  showNotification(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    this.confirmationMessage = message;
    this.messageType = type;
    this.showMessage = true;

    // Auto-hide après 5 secondes
    setTimeout(() => {
      this.hideNotification();
    }, 5000);
  }

  // 🙈 Masquer les notifications
  hideNotification(): void {
    this.showMessage = false;
    this.confirmationMessage = '';
  }

  // 🔄 Rafraîchir la liste des visiteurs
  private refreshVisiteursList(): void {
    window.dispatchEvent(new CustomEvent('refresh-visiteurs'));
  }

  // 🚪 Validation de sortie
  validerSortie(id: number): void {
    this.visiteurService.validerSortie(id).subscribe({
      next: () => {
        this.refreshVisiteursList();
        this.loadCompteur();
        this.showNotification('Sortie validée avec succès', 'success');
      },
      error: (err) => {
        console.error('Erreur validation sortie', err);
        this.showNotification('Erreur lors de la validation de sortie', 'error');
      }
    });
  }

  // 🗑️ Suppression de visiteur avec confirmation
  supprimerVisiteur(id: number): void {
    if (confirm("Voulez-vous vraiment supprimer ce visiteur ?")) {
      this.visiteurService.supprimer(id).subscribe({
        next: () => {
          this.loadCompteur();
          this.refreshVisiteursList();
          this.showNotification('Visiteur supprimé avec succès', 'success');
        },
        error: (err) => {
          console.error('Erreur suppression', err);
          this.showNotification('Erreur lors de la suppression', 'error');
        }
      });
    }
  }

  // 🎛️ Interface utilisateur
  toggleMenu(): void {
    this.menuOuvert = !this.menuOuvert;
  }

  logout(): void {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      localStorage.clear();
      window.location.href = '/';
    }
  }

  // 🔒 Gestion du mot de passe
  ouvrirModalePassword(): void {
    this.resetPasswordForm();
    this.modalePasswordVisible = true;
  }

  fermerModalePassword(): void {
    this.modalePasswordVisible = false;
    this.resetPasswordForm();
  }

  private resetPasswordForm(): void {
    this.ancienMotDePasse = '';
    this.nouveauMotDePasse = '';
    this.messageErreur = '';
    this.messageSuccess = '';
  }

  changerMotDePasse(): void {
    if (!this.ancienMotDePasse || !this.nouveauMotDePasse) {
      this.messageErreur = 'Veuillez remplir tous les champs.';
      return;
    }

    if (this.nouveauMotDePasse.length < 6) {
      this.messageErreur = 'Le nouveau mot de passe doit contenir au moins 6 caractères.';
      return;
    }

    const payload = {
      ancienPassword: this.ancienMotDePasse,
      nouveauPassword: this.nouveauMotDePasse
    };

    this.http.post('http://localhost:8085/auth/update-password', payload).subscribe({
      next: () => {
        this.messageSuccess = "Mot de passe modifié avec succès.";
        this.messageErreur = "";
        setTimeout(() => this.fermerModalePassword(), 2000);
      },
      error: (err) => {
        this.messageErreur = err.status === 400 
          ? "Ancien mot de passe incorrect." 
          : "Erreur lors de la modification.";
        this.messageSuccess = "";
      }
    });
  }

  // 🔍 Méthodes utilitaires
  titlecase(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  getFieldError(fieldName: string): string {
    const control = this.visiteurForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    const errors = control.errors;
    
    if (errors['required']) return `${this.getFieldLabel(fieldName)} est requis`;
    if (errors['minlength']) return `${this.getFieldLabel(fieldName)} doit contenir au moins ${errors['minlength'].requiredLength} caractères`;
    if (errors['maxlength']) return `${this.getFieldLabel(fieldName)} ne peut pas dépasser ${errors['maxlength'].requiredLength} caractères`;
    if (errors['pattern']) return `Format invalide pour ${this.getFieldLabel(fieldName)}`;
    if (errors['specialCharacters']) return `${this.getFieldLabel(fieldName)} ne peut pas contenir de caractères spéciaux`;
    if (errors['invalidCin']) return 'Format CIN invalide (ex: A123456, AB123456 ou 123456AB)';
    if (errors['invalidPhone']) return 'Numéro de téléphone invalide';

    return 'Champ invalide';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      nom: 'Le nom',
      prenom: 'Le prénom',
      cin: 'Le CIN',
      telephone: 'Le téléphone',
      destination: 'La destination',
      genre: 'Le genre'
    };
    return labels[fieldName] || 'Ce champ';
  }

  // 🔧 Validateurs personnalisés
  private noSpecialCharactersValidator(control: AbstractControl): {[key: string]: any} | null {
    if (!control.value) return null;
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(control.value);
    return hasSpecialChars ? { specialCharacters: true } : null;
  }

  // 🆔 Validateur CIN modifié - Plus flexible
  private cinValidator(control: AbstractControl): {[key: string]: any} | null {
    if (!control.value) return null;
    
    const cinValue = control.value.toString().trim().toUpperCase();
    
    // Différents formats acceptés :
    // Format 1: 1-2 lettres suivies de 4-8 chiffres (ex: A123456, AB123456)
    // Format 2: 4-8 chiffres suivis de 1-2 lettres (ex: 123456A, 123456AB)
    // Format 3: Uniquement des chiffres (ex: 12345678)
    
    const cinPatterns = [
      /^[A-Z]{1,2}[0-9]{4,8}$/, // Lettres puis chiffres
      /^[0-9]{4,8}[A-Z]{1,2}$/, // Chiffres puis lettres
      /^[0-9]{6,8}$/             // Uniquement chiffres
    ];
    
    const isValidCin = cinPatterns.some(pattern => pattern.test(cinValue));
    
    return isValidCin ? null : { invalidCin: true };
  }

  private phoneValidator(control: AbstractControl): {[key: string]: any} | null {
    if (!control.value) return null;
    const phonePattern = /^(0[5-7])[0-9]{8}$/;
    const cleanPhone = control.value.replace(/\s/g, '');
    return phonePattern.test(cleanPhone) ? null : { invalidPhone: true };
  }
}