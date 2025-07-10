import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ajouter-visiteur-page',
  standalone: false,
  templateUrl: './ajouter-visiteur-page.component.html',
  styleUrls: ['./ajouter-visiteur-page.component.css']
})
export class AjouterVisiteurPageComponent implements OnInit, OnDestroy {

  // ✅ Configuration de la navigation (vide car pas de sidebar spécifique)
  navigationItems: any[] = [];

  // 🔄 États de chargement
  loading = false;

  // 🎯 Écouteurs d'événements
  private clickListener: any;
  private keyListener: any;

  constructor(
    private http: HttpClient, 
    private router: Router
  ) {}

  ngOnInit(): void {
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    this.cleanupEventListeners();
  }

  // ✅ Callback appelé après changement de mot de passe via le composant unifié
  onPasswordChanged(): void {
    console.log('🔐 Mot de passe changé avec succès depuis ajouter visiteur');
    this.showNotification('Mot de passe mis à jour avec succès !');
  }

  // 🚀 NOUVELLE MÉTHODE: Navigation vers BamyDelivery
  navigateToBamyDelivery(): void {
    console.log('🚚 Navigation vers BamyDelivery');
    this.router.navigate(['/ajouterLivraison']);
  }

  // 🚀 Configuration des écouteurs d'événements
  private setupEventListeners(): void {
    // Écouteur pour fermer avec Escape
    this.keyListener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Gestion des raccourcis clavier spécifiques à cette page
        this.handleEscapeKey();
      }
    };

    document.addEventListener('keydown', this.keyListener);
  }

  // 🧹 Nettoyage des écouteurs
  private cleanupEventListeners(): void {
    if (this.keyListener) {
      document.removeEventListener('keydown', this.keyListener);
    }
  }

  // ⌨️ Gestion de la touche Escape
  private handleEscapeKey(): void {
    // Logique spécifique à votre page si nécessaire
    console.log('🔑 Touche Escape pressée dans ajouter-visiteur');
  }

  // 💬 Affichage des notifications
  private showNotification(message: string): void {
    // Implémentation simple - vous pouvez utiliser une bibliothèque de notifications
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fadeIn';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // 🎨 Méthodes utilitaires pour l'affichage (si nécessaire)
  refresh(): void {
    window.location.reload();
  }

  // 🚀 Actions spécifiques à la page
  onFormSubmitted(): void {
    // Logique après soumission du formulaire
    console.log('📝 Formulaire soumis');
  }

  onVisitorAdded(): void {
    // Logique après ajout d'un visiteur
    console.log('👤 Visiteur ajouté');
    this.showNotification('Visiteur ajouté avec succès !');
  }

  // 🔄 Rafraîchissement de la liste
  refreshVisitorList(): void {
    // Logique pour rafraîchir la liste des visiteurs
    console.log('🔄 Rafraîchissement de la liste des visiteurs');
  }

  // 📊 Gestion des erreurs
  handleError(error: any): void {
    console.error('❌ Erreur dans ajouter-visiteur:', error);
    this.showErrorNotification('Une erreur est survenue');
  }

  // 💬 Notification d'erreur
  private showErrorNotification(message: string): void {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fadeIn';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // 🎯 Navigation vers d'autres pages
  goToVisitorList(): void {
    this.router.navigate(['/visiteurs']);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  // 📱 Gestion des événements mobile (si nécessaire)
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    // Logique de redimensionnement si nécessaire
  }

  // 🎯 Raccourcis clavier pour cette page
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Ctrl+S pour sauvegarder (si formulaire)
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      this.quickSave();
    }

    // Ctrl+R pour rafraîchir la liste
    if (event.ctrlKey && event.key === 'r') {
      event.preventDefault();
      this.refreshVisitorList();
    }

    // Ctrl+D pour aller vers BamyDelivery
    if (event.ctrlKey && event.key === 'd') {
      event.preventDefault();
      this.navigateToBamyDelivery();
    }
  }

  // 💾 Sauvegarde rapide
  private quickSave(): void {
    console.log('💾 Sauvegarde rapide activée');
    // Logique de sauvegarde rapide
  }
}