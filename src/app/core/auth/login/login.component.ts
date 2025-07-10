import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage = '';

  // ✅ Variable pour afficher ou cacher le mot de passe
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  // ✅ Méthode pour inverser la visibilité du mot de passe
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;

      this.authService.login(email, password).subscribe({
        next: (res) => {
          const role = res.role?.toUpperCase();
          localStorage.setItem('role', role);

          if (role === 'ADMIN') {
            this.router.navigate(['/admin/dashboard']);
          } else if (role === 'AGENT') {
            // ✅ MODIFICATION: Redirection vers ajouterVisiteur au lieu de agent/dashboard
            this.router.navigate(['/ajouterVisiteur']);
          } else if (role === 'RESPONSABLE') {
            this.router.navigate(['/responsable/dashboard']);
          } else {
            this.errorMessage = 'Rôle inconnu. Veuillez contacter l\'administrateur.';
          }
        },
        error: () => {
          this.errorMessage = 'Email ou mot de passe incorrect.';
        }
      });
    }
  }
}