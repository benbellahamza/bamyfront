import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from 'app/core/services/admin/admin.service';

@Component({
  selector: 'app-ajouter-utilisateur',
  standalone:false,
  templateUrl: './ajouter-utilisateur.component.html',
  styleUrls: ['./ajouter-utilisateur.component.css']
})
export class AjouterUtilisateurComponent {
  userForm!: FormGroup;
  roles: string[] = ['ADMIN', 'AGENT', 'RESPONSABLE']; // Liste des rôles possibles
  successMessage = '';
  errorMessage = '';

  constructor(private fb: FormBuilder, private adminService: AdminService, private router: Router) {
    this.userForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.userForm.invalid) {
      return;
    }

    this.adminService.ajouterUtilisateur(this.userForm.value).subscribe({
      next: (res) => {
        this.successMessage = 'Utilisateur ajouté avec succès !';
        this.errorMessage = '';
        this.userForm.reset();
        this.router.navigate(['/admin/dashboard']); // Redirection après ajout
      },
      error: (err) => {
        this.errorMessage = err.error.message || 'Erreur lors de l\'ajout de l\'utilisateur';
        this.successMessage = '';
      }
    });
  }
}
