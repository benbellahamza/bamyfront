import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-agent',
  standalone: false,
  templateUrl: './dashboard-agent.component.html',
  styleUrls: ['./dashboard-agent.component.css']
})
export class DashboardAgentComponent implements OnInit {

  // ✅ Configuration de la navigation pour l'agent
  navigationItems = [
    {
      label: 'Tableau de bord',
      route: '/agent/dashboard',
      icon: 'dashboard'
    },
    {
      label: 'Mes tâches',
      route: '/agent/taches',
      icon: 'clipboard-list'
    },
    {
      label: 'Ajouter visiteur',
      route: '/ajouterVisiteur',
      icon: 'user-plus'
    },
    {
      label: 'Ajouter livraison',
      route: '/ajouterLivraison',
      icon: 'truck'
    },
    {
      label: 'Historique',
      route: '/agent/historique',
      icon: 'clock'
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
    console.log('🔐 Mot de passe changé avec succès par l\'agent');
    // Vous pouvez ajouter ici une notification ou une action spécifique
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