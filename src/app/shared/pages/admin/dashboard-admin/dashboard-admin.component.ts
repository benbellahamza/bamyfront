import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from 'app/core/services/admin/admin.service';

@Component({
  selector: 'app-dashboard-admin',
  standalone:false,
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent implements OnInit {
  utilisateurs: any[] = [];
  errorMessage = '';

  constructor(private adminService: AdminService, private router: Router) {}

  ngOnInit(): void {
    this.getUtilisateurs();
  }

  getUtilisateurs() {
    this.adminService.getUtilisateurs().subscribe({
      next: (res) => {
        this.utilisateurs = res;
      },
      error: (err) => {
        this.errorMessage = err.error.message || 'Erreur lors du chargement des utilisateurs';
      }
    });
  }

  allerAjouterUtilisateur() {
    this.router.navigate(['/ajouterUtilisateur']);
  }

  modifierUtilisateur(utilisateur: any) {
    // Tu peux ouvrir une modale ou rediriger vers une page de modification
    console.log('Modifier utilisateur', utilisateur);
  }

  reinitialiserMotDePasse(utilisateur: any) {
    // Appel API pour reset mot de passe
    console.log('Réinitialiser mot de passe pour', utilisateur);
  }
}
