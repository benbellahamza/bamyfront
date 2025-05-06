import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'] // ✅ (correction "styleUrl" => "styleUrls")
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage = '';

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

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;

      this.authService.login(email, password).subscribe({
        next: (res) => {
          const role = res.role?.toUpperCase(); // 🔥 rôle retourné par le backend
          localStorage.setItem('role', role); // 🔁 facultatif mais clair

          // Redirection selon le rôle
          if (role === 'ADMIN') {
            this.router.navigate(['/admin/dashboard']);
          } else if (role === 'AGENT') {
            this.router.navigate(['/agent/dashboard']);
          } else if (role === 'RESPONSABLE') {
            this.router.navigate(['/responsable/visiteur']);
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
