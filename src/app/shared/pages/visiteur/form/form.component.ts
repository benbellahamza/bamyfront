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
  // 🎯 Propriétés principales du formulaire
  visiteurForm!: FormGroup;
  selectedVisiteurId: number | null = null;
  loading = false;
  
  // 📊 Données d'affichage en temps réel
  compteur: number = 0;
  currentTime: string = '';
  currentFullDate: string = '';
  
  // 💬 Messages et notifications
  confirmationMessage = '';
  messageType: 'success' | 'error' | 'warning' = 'success';
  showMessage = false;
  
  // 📈 Progression du formulaire
  formProgress = 0;
  totalSteps = 6; // Nombre d'étapes dans le formulaire (nom, prénom, cin, genre, destination, téléphone)
  
  // 🎨 États visuels des champs avec validation en temps réel
  fieldStates: { [key: string]: 'default' | 'valid' | 'invalid' } = {};
  
  // 🔄 Validation en temps réel avec debounce
  private destroy$ = new Subject<void>();
  private validationDebounce$ = new Subject<string>();
  
  // 👤 Utilisateur connecté (vos propriétés existantes)
  utilisateur = {
    nom: '',
    prenom: '',
    email: '',
    role: ''
  };
  
  // 🎛️ Interface utilisateur (vos propriétés existantes)
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

  // 🚀 Initialisation complète du composant
  private initializeComponent(): void {
    this.decodeToken();
    this.createFormWithAdvancedValidation();
    this.loadCompteur();
    this.startClock();
    this.setupFormProgressTracking();
  }

  // 🎧 Configuration des écouteurs d'événements professionnels
  private setupEventListeners(): void {
    // Écouter l'événement d'édition de visiteur
    window.addEventListener('edit-visiteur', (e: any) => {
      this.handleEditVisiteur(e.detail);
    });

    // Écouter les changements de fenêtre pour la validation
    window.addEventListener('beforeunload', (e) => {
      if (this.visiteurForm.dirty && !this.confirmationMessage) {
        e.preventDefault();
        e.returnValue = 'Des modifications non sauvegardées seront perdues.';
        return 'Des modifications non sauvegardées seront perdues.';
      }
      return null;
    });

    // Écouter les raccourcis clavier
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        this.onSubmit();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.resetForm();
      }
    });
  }

  // ⚡ Configuration de la validation avec debounce avancée
  private setupValidationDebounce(): void {
    this.validationDebounce$
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(fieldName => {
        this.validateFieldWithAnimations(fieldName);
      });
  }

  // 🔐 Décodage du token JWT (votre méthode existante)
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

  // 📝 Création du formulaire avec validation avancée et icônes
  createFormWithAdvancedValidation(): void {
    this.visiteurForm = this.fb.group({
      nom: ['', [
        Validators.required, 
        Validators.minLength(2),
        Validators.maxLength(50),
        this.noSpecialCharactersValidator,
        this.nameValidator
      ]],
      prenom: ['', [
        Validators.required, 
        Validators.minLength(2),
        Validators.maxLength(50),
        this.noSpecialCharactersValidator,
        this.nameValidator
      ]],
      cin: ['', [
        Validators.required, 
        Validators.minLength(5),
        Validators.maxLength(12),
        this.cinValidatorAdvanced
      ]],
      genre: ['', Validators.required],
      destination: ['', Validators.required],
      typeVisiteur: [''], // Optionnel
      telephone: ['', [
        Validators.required, 
        this.phoneValidatorAdvanced
      ]],
      matricule: [''] // Conditionnel selon destination
    });

    this.setupDynamicValidationAdvanced();
    this.initializeFieldStates();
  }

  // 🎯 Configuration de la validation dynamique avancée
  private setupDynamicValidationAdvanced(): void {
    // Surveillance des changements de destination pour le matricule
    this.visiteurForm.get('destination')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(destination => {
        const matriculeControl = this.visiteurForm.get('matricule');
        
        if (destination === 'atelier') {
          // Matricule optionnel pour l'atelier avec pattern spécifique
          matriculeControl?.clearValidators();
          matriculeControl?.setValidators([
            Validators.pattern(/^[A-Z0-9]{3,10}$/),
            this.matriculeValidator
          ]);
        } else {
          matriculeControl?.clearValidators();
          matriculeControl?.setValue('');
        }
        
        matriculeControl?.updateValueAndValidity();
        this.updateProgressWithAnimation();
      });

    // Surveillance de tous les champs pour la validation en temps réel
    Object.keys(this.visiteurForm.controls).forEach(key => {
      this.visiteurForm.get(key)?.valueChanges
        .pipe(
          debounceTime(100),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.validationDebounce$.next(key);
          this.updateProgressWithAnimation();
        });
    });
  }

  // 📊 Configuration du suivi de progression
  private setupFormProgressTracking(): void {
    this.visiteurForm.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateProgressWithAnimation();
      });
  }

  // 🎨 Initialisation des états visuels des champs
  private initializeFieldStates(): void {
    Object.keys(this.visiteurForm.controls).forEach(key => {
      this.fieldStates[key] = 'default';
    });
  }

  // ✅ Validation en temps réel d'un champ avec animations
  private validateFieldWithAnimations(fieldName: string): void {
    const control = this.visiteurForm.get(fieldName);
    if (!control) return;

    const previousState = this.fieldStates[fieldName];
    
    if (control.valid && control.value) {
      this.fieldStates[fieldName] = 'valid';
      if (previousState !== 'valid') {
        this.animateFieldSuccess(fieldName);
      }
    } else if (control.invalid && control.touched) {
      this.fieldStates[fieldName] = 'invalid';
      if (previousState !== 'invalid') {
        this.animateFieldError(fieldName);
      }
    } else {
      this.fieldStates[fieldName] = 'default';
    }

    this.cdr.detectChanges();
  }

  // 🎬 Animation de succès pour un champ
  private animateFieldSuccess(fieldName: string): void {
    const element = document.querySelector(`[formControlName="${fieldName}"]`);
    if (element) {
      element.classList.add('animate-success');
      setTimeout(() => element.classList.remove('animate-success'), 600);
    }
  }

  // 🎬 Animation d'erreur pour un champ
  private animateFieldError(fieldName: string): void {
    const element = document.querySelector(`[formControlName="${fieldName}"]`);
    if (element) {
      element.classList.add('animate-error');
      setTimeout(() => element.classList.remove('animate-error'), 600);
    }
  }

  // 📊 Mise à jour de la progression avec animation
  private updateProgressWithAnimation(): void {
    const controls = this.visiteurForm.controls;
    const requiredFields = ['nom', 'prenom', 'cin', 'genre', 'destination', 'telephone'];
    
    let filledFields = 0;
    let validFields = 0;
    
    requiredFields.forEach(field => {
      if (controls[field]?.value) {
        filledFields++;
        if (controls[field]?.valid) {
          validFields++;
        }
      }
    });

    const newProgress = Math.round((validFields / requiredFields.length) * 100);
    
    // Animation de la barre de progression
    if (newProgress !== this.formProgress) {
      this.animateProgress(this.formProgress, newProgress);
      this.formProgress = newProgress;
    }
  }

  // 🎬 Animation de la barre de progression
  private animateProgress(from: number, to: number): void {
    const progressBar = document.querySelector('.progress-track') as HTMLElement;
    if (!progressBar) return;

    let current = from;
    const increment = (to - from) / 20;
    
    const animate = () => {
      current += increment;
      if ((increment > 0 && current < to) || (increment < 0 && current > to)) {
        progressBar.style.width = `${current}%`;
        requestAnimationFrame(animate);
      } else {
        progressBar.style.width = `${to}%`;
      }
    };
    
    animate();
  }

  // 🕒 Gestion de l'horloge en temps réel (votre méthode existante améliorée)
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

  // 📈 Chargement du compteur avec animation (votre méthode existante améliorée)
  loadCompteur(): void {
    this.http.get<number>('http://localhost:8085/api/compteur').subscribe({
      next: (data) => {
        this.animateCounterChange(this.compteur, data);
        this.compteur = data;
      },
      error: (err) => {
        console.error('❌ Erreur chargement compteur', err);
        this.compteur = 0;
        this.showNotification('Impossible de charger le compteur', 'warning');
      }
    });
  }

  // 🎬 Animation du changement de compteur
  private animateCounterChange(from: number, to: number): void {
    const counterElement = document.querySelector('.counter-value');
    if (!counterElement || from === to) return;

    let current = from;
    const increment = (to - from) / 10;
    
    const animate = () => {
      current += increment;
      if ((increment > 0 && current < to) || (increment < 0 && current > to)) {
        counterElement.textContent = Math.round(current).toString();
        requestAnimationFrame(animate);
      } else {
        counterElement.textContent = to.toString();
        counterElement.classList.add('animate-pulse-once');
        setTimeout(() => counterElement.classList.remove('animate-pulse-once'), 1000);
      }
    };
    
    animate();
  }

  // 🎛️ Gestion de l'édition d'un visiteur avec animation
  private handleEditVisiteur(visiteur: any): void {
    this.selectedVisiteurId = visiteur.id;

    // Animation d'entrée en mode édition
    const formElement = document.querySelector('.main-form');
    if (formElement) {
      formElement.classList.add('edit-mode-animation');
      setTimeout(() => formElement.classList.remove('edit-mode-animation'), 500);
    }

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
    this.updateProgressWithAnimation();
    
    // Validation de tous les champs après édition
    setTimeout(() => {
      Object.keys(this.visiteurForm.controls).forEach(key => {
        this.validateFieldWithAnimations(key);
      });
    }, 100);
  }

  // 📤 Soumission du formulaire avec validation complète et animations
  onSubmit(): void {
    // Empêcher double soumission
    if (this.loading) return;

    // Validation finale avant soumission
    if (this.visiteurForm.invalid) {
      this.markAllFieldsAsTouched();
      this.showNotification('Veuillez corriger les erreurs dans le formulaire', 'error');
      this.scrollToFirstError();
      this.animateFormError();
      return;
    }

    this.loading = true;
    this.animateSubmitStart();
    this.showNotification('Enregistrement en cours...', 'warning');

    const formData = this.prepareFormDataAdvanced();
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
        console.error('❌ Erreur soumission', err);
        this.handleSubmitError(err);
      }
    });
  }

  // 🎬 Animation de début de soumission
  private animateSubmitStart(): void {
    const submitButton = document.querySelector('.submit-button');
    if (submitButton) {
      submitButton.classList.add('submitting');
    }
  }

  // 🎬 Animation d'erreur de formulaire
  private animateFormError(): void {
    const formElement = document.querySelector('.main-form');
    if (formElement) {
      formElement.classList.add('form-error-shake');
      setTimeout(() => formElement.classList.remove('form-error-shake'), 600);
    }
  }

  // 🗃️ Préparation avancée des données du formulaire
  private prepareFormDataAdvanced(): any {
    const formValue = { ...this.visiteurForm.value };
    
    // Normalisation et validation des données
    formValue.nom = this.normalizeText(formValue.nom);
    formValue.prenom = this.capitalizeFirstLetter(formValue.prenom?.trim());
    formValue.cin = formValue.cin?.trim().toUpperCase();
    formValue.telephone = this.normalizePhoneNumber(formValue.telephone);
    
    // Ajout de métadonnées
    formValue.dateCreation = new Date().toISOString();
    formValue.utilisateurCreation = this.utilisateur.email;
    
    return formValue;
  }

  // 🔧 Méthodes utilitaires de normalisation
  private normalizeText(text: string): string {
    return text?.trim().toUpperCase().replace(/\s+/g, ' ');
  }

  private capitalizeFirstLetter(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  private normalizePhoneNumber(phone: string): string {
    return phone?.replace(/\s/g, '').replace(/[^\d]/g, '');
  }

  // ✅ Gestion du succès de soumission avec animations
  private handleSubmitSuccess(message: string): void {
    this.showNotification(message, 'success');
    this.animateSuccessSubmit();
    this.resetFormWithAnimation();
    this.loading = false;
    this.loadCompteur();
    this.refreshVisiteursList();
  }

  // ❌ Gestion des erreurs de soumission avec messages détaillés
  private handleSubmitError(error: any): void {
    this.loading = false;
    this.animateSubmitError();
    
    let errorMessage = 'Erreur lors de la soumission. Veuillez réessayer.';
    
    if (error.status === 400) {
      errorMessage = 'Données invalides. Vérifiez vos informations.';
    } else if (error.status === 409) {
      errorMessage = 'Ce visiteur existe déjà (CIN déjà utilisé).';
      this.highlightFieldError('cin');
    } else if (error.status === 422) {
      errorMessage = 'Format de données incorrect.';
    } else if (error.status === 500) {
      errorMessage = 'Erreur serveur. Contactez l\'administrateur.';
    } else if (error.status === 0) {
      errorMessage = 'Impossible de contacter le serveur.';
    }
    
    this.showNotification(errorMessage, 'error');
  }

  // 🎬 Animations de succès et d'erreur
  private animateSuccessSubmit(): void {
    const form = document.querySelector('.main-form');
    if (form) {
      form.classList.add('success-pulse');
      setTimeout(() => form.classList.remove('success-pulse'), 1000);
    }
  }

  private animateSubmitError(): void {
    const submitButton = document.querySelector('.submit-button');
    if (submitButton) {
      submitButton.classList.remove('submitting');
      submitButton.classList.add('error-shake');
      setTimeout(() => submitButton.classList.remove('error-shake'), 600);
    }
  }

  // 🎯 Mise en évidence d'un champ en erreur
  private highlightFieldError(fieldName: string): void {
    const field = document.querySelector(`[formControlName="${fieldName}"]`);
    if (field) {
      field.classList.add('highlight-error');
      setTimeout(() => field.classList.remove('highlight-error'), 3000);
    }
  }

  // 🔄 Réinitialisation du formulaire avec animation
  resetFormWithAnimation(): void {
    const form = document.querySelector('.main-form');
    if (form) {
      form.classList.add('reset-animation');
      setTimeout(() => form.classList.remove('reset-animation'), 500);
    }

    this.visiteurForm.reset();
    this.selectedVisiteurId = null;
    this.initializeFieldStates();
    this.formProgress = 0;
    
    // Réinitialisation des validateurs
    const matriculeControl = this.visiteurForm.get('matricule');
    matriculeControl?.clearValidators();
    matriculeControl?.updateValueAndValidity();

    // Animation de la barre de progression vers 0
    this.animateProgress(this.formProgress, 0);
  }

  // 🔄 Méthode de réinitialisation publique (votre méthode existante)
  resetForm(): void {
    this.resetFormWithAnimation();
  }

  // 🎯 Marquer tous les champs comme touchés avec animation
  private markAllFieldsAsTouched(): void {
    Object.keys(this.visiteurForm.controls).forEach(key => {
      const control = this.visiteurForm.get(key);
      control?.markAsTouched();
      this.validateFieldWithAnimations(key);
    });
  }

  // 📜 Défiler vers la première erreur avec animation douce
  private scrollToFirstError(): void {
    const firstErrorElement = document.querySelector('.input-error:not([style*="display: none"]), .error-state');
    if (firstErrorElement) {
      firstErrorElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
      
      // Highlight temporaire
      firstErrorElement.classList.add('highlight-error');
      setTimeout(() => firstErrorElement.classList.remove('highlight-error'), 2000);
    }
  }

  // 📢 Affichage des notifications avec auto-hide intelligent
  showNotification(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
    this.confirmationMessage = message;
    this.messageType = type;
    this.showMessage = true;

    // Auto-hide avec timing différent selon le type
    const hideDelay = type === 'error' ? 7000 : type === 'warning' ? 5000 : 4000;
    
    setTimeout(() => {
      this.hideNotification();
    }, hideDelay);
  }

  // 🙈 Masquer les notifications avec animation
  hideNotification(): void {
    const messageElement = document.querySelector('.message-box');
    if (messageElement) {
      messageElement.classList.add('fade-out');
      setTimeout(() => {
        this.showMessage = false;
        this.confirmationMessage = '';
        this.cdr.detectChanges();
      }, 300);
    } else {
      this.showMessage = false;
      this.confirmationMessage = '';
    }
  }

  // 🔄 Rafraîchir la liste des visiteurs (votre méthode existante)
  private refreshVisiteursList(): void {
    window.dispatchEvent(new CustomEvent('refresh-visiteurs'));
  }

  // 🚪 Validation de sortie (votre méthode existante)
  validerSortie(id: number): void {
    this.visiteurService.validerSortie(id).subscribe({
      next: () => {
        this.refreshVisiteursList();
        this.loadCompteur();
        this.showNotification('Sortie validée avec succès', 'success');
      },
      error: (err) => {
        console.error('❌ Erreur validation sortie', err);
        this.showNotification('Erreur lors de la validation de sortie', 'error');
      }
    });
  }

  // 🗑️ Suppression de visiteur avec confirmation (votre méthode existante)
  supprimerVisiteur(id: number): void {
    if (confirm("Voulez-vous vraiment supprimer ce visiteur ?")) {
      this.visiteurService.supprimer(id).subscribe({
        next: () => {
          this.loadCompteur();
          this.refreshVisiteursList();
          this.showNotification('Visiteur supprimé avec succès', 'success');
        },
        error: (err) => {
          console.error('❌ Erreur suppression', err);
          this.showNotification('Erreur lors de la suppression', 'error');
        }
      });
    }
  }

  // 🎛️ Interface utilisateur (vos méthodes existantes)
  toggleMenu(): void {
    this.menuOuvert = !this.menuOuvert;
  }

  logout(): void {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      localStorage.clear();
      window.location.href = '/';
    }
  }

  // 🔒 Gestion du mot de passe (vos méthodes existantes)
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

  // 🔍 Méthodes utilitaires (vos méthodes existantes améliorées)
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
    if (errors['invalidPhone']) return 'Numéro de téléphone invalide (ex: 06XXXXXXXX)';
    if (errors['invalidName']) return `${this.getFieldLabel(fieldName)} contient des caractères non autorisés`;
    if (errors['invalidMatricule']) return 'Format matricule invalide (3-10 caractères alphanumériques)';

    return 'Champ invalide';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      nom: 'Le nom',
      prenom: 'Le prénom',
      cin: 'Le CIN',
      telephone: 'Le téléphone',
      destination: 'La destination',
      genre: 'Le genre',
      matricule: 'Le matricule'
    };
    return labels[fieldName] || 'Ce champ';
  }

  // 🔧 Validateurs personnalisés avancés
  private noSpecialCharactersValidator(control: AbstractControl): {[key: string]: any} | null {
    if (!control.value) return null;
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(control.value);
    return hasSpecialChars ? { specialCharacters: true } : null;
  }

  // 👤 Validateur de nom avancé
  private nameValidator(control: AbstractControl): {[key: string]: any} | null {
    if (!control.value) return null;
    
    const nameValue = control.value.toString().trim();
    
    // Vérifier les caractères autorisés (lettres, espaces, traits d'union, apostrophes)
    const validNamePattern = /^[a-zA-ZÀ-ÿ\s\-']+$/;
    
    if (!validNamePattern.test(nameValue)) {
      return { invalidName: true };
    }
    
    // Vérifier qu'il n'y a pas d'espaces consécutifs
    if (/\s{2,}/.test(nameValue)) {
      return { invalidName: true };
    }
    
    return null;
  }

  // 🆔 Validateur CIN avancé et flexible
  private cinValidatorAdvanced(control: AbstractControl): {[key: string]: any} | null {
    if (!control.value) return null;
    
    const cinValue = control.value.toString().trim().toUpperCase();
    
    // Différents formats acceptés avec validation renforcée :
    // Format 1: 1-2 lettres suivies de 4-8 chiffres (ex: A123456, AB123456)
    // Format 2: 4-8 chiffres suivis de 1-2 lettres (ex: 123456A, 123456AB)
    // Format 3: Uniquement des chiffres (ex: 12345678)
    
    const cinPatterns = [
      /^[A-Z]{1,2}[0-9]{4,8}$/, // Lettres puis chiffres
      /^[0-9]{4,8}[A-Z]{1,2}$/, // Chiffres puis lettres
      /^[0-9]{6,8}$/             // Uniquement chiffres
    ];
    
    const isValidCin = cinPatterns.some(pattern => pattern.test(cinValue));
    
    if (!isValidCin) {
      return { invalidCin: true };
    }
    
    // Validation supplémentaire: éviter les séquences répétitives
    if (/^(.)\1{4,}$/.test(cinValue)) {
      return { invalidCin: true };
    }
    
    return null;
  }

  // 📱 Validateur téléphone avancé
  private phoneValidatorAdvanced(control: AbstractControl): {[key: string]: any} | null {
    if (!control.value) return null;
    
    const phoneValue = control.value.toString().replace(/\s/g, '');
    
    // Formats acceptés:
    // - Numéros mobiles: 06, 07 (9 chiffres après)
    // - Numéros fixes: 05 (9 chiffres après)
    const phonePatterns = [
      /^(0[5-7])[0-9]{8}$/, // Format standard marocain
      /^\+212[5-7][0-9]{8}$/, // Format international
      /^00212[5-7][0-9]{8}$/ // Format international alternatif
    ];
    
    const isValidPhone = phonePatterns.some(pattern => pattern.test(phoneValue));
    
    if (!isValidPhone) {
      return { invalidPhone: true };
    }
    
    // Validation supplémentaire: éviter les numéros évidemment faux
    if (/^(.)\1{8,}$/.test(phoneValue)) {
      return { invalidPhone: true };
    }
    
    return null;
  }

  // 🏷️ Validateur matricule
  private matriculeValidator(control: AbstractControl): {[key: string]: any} | null {
    if (!control.value) return null;
    
    const matriculeValue = control.value.toString().trim().toUpperCase();
    
    // Format: 3-10 caractères alphanumériques
    const matriculePattern = /^[A-Z0-9]{3,10}$/;
    
    if (!matriculePattern.test(matriculeValue)) {
      return { invalidMatricule: true };
    }
    
    return null;
  }

  // 🎛️ Méthodes d'aide pour l'interface
  isFieldValid(fieldName: string): boolean {
    return this.fieldStates[fieldName] === 'valid';
  }

  isFieldInvalid(fieldName: string): boolean {
    return this.fieldStates[fieldName] === 'invalid';
  }

  isFormSubmittable(): boolean {
    return this.visiteurForm.valid && !this.loading;
  }

  getFormCompletionPercentage(): number {
    return this.formProgress;
  }

  // 🎨 Méthodes pour les animations CSS
  getFieldAnimationClass(fieldName: string): string {
    const state = this.fieldStates[fieldName];
    switch (state) {
      case 'valid': return 'field-valid-animation';
      case 'invalid': return 'field-invalid-animation';
      default: return '';
    }
  }

  // 🔄 Méthode pour forcer la re-validation de tous les champs
  revalidateAllFields(): void {
    Object.keys(this.visiteurForm.controls).forEach(key => {
      this.validateFieldWithAnimations(key);
    });
  }

  // 📊 Méthodes pour les statistiques du formulaire
  getFieldsValidCount(): number {
    return Object.values(this.fieldStates).filter(state => state === 'valid').length;
  }

  getFieldsInvalidCount(): number {
    return Object.values(this.fieldStates).filter(state => state === 'invalid').length;
  }

  // 🎯 Méthode pour obtenir le premier champ invalide
  getFirstInvalidField(): string | null {
    for (const [fieldName, state] of Object.entries(this.fieldStates)) {
      if (state === 'invalid') {
        return fieldName;
      }
    }
    return null;
  }
}