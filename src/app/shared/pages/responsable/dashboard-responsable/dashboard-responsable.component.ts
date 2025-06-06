import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-responsable',
  standalone: false,
  templateUrl: './dashboard-responsable.component.html',
  styleUrls: ['./dashboard-responsable.component.css']
})
export class DashboardResponsableComponent implements OnInit {

  // ✅ Configuration de la navigation pour le responsable
  navigationItems = [
    {
      label: 'Tableau de bord',
      route: '/responsable/dashboard',
      icon: 'dashboard'
    },
    {
      label: 'Gestion équipes',
      route: '/responsable/equipes',
      icon: 'users'
    },
    {
      label: 'Validation demandes',
      route: '/responsable/validations',
      icon: 'check-circle'
    },
    {
      label: 'Visiteurs',
      route: '/responsable/visiteur',
      icon: 'user-group'
    },
    {
      label: 'Livraisons',
      route: '/responsable/livraison',
      icon: 'truck'
    },
    {
      label: 'Rapports',
      route: '/responsable/rapports',
      icon: 'chart-bar'
    }
  ];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    // Initialisation du composant
  }

  /**
   * ✅ Navigation vers une page spécifique
   */
  goTo(path: string): void {
    this.router.navigate(['/' + path]);
  }

  /**
   * ✅ Callback appelé après changement de mot de passe
   */
  onPasswordChanged(): void {
    console.log('🔐 Mot de passe changé avec succès par le responsable');
    this.showNotification('Mot de passe mis à jour avec succès !');
  }

  /**
   * ✅ Affiche une notification (optionnel)
   */
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
}