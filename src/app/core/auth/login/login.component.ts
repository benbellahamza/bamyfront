import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
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
        next: () => {
          const role = this.authService.getRole();
          switch (role) {
            case 'ADMIN':
              this.router.navigate(['admin/dashboard']);
              break;
            case 'RESPONSABLE':
              this.router.navigate(['responsable/visiteur']);
              break;
            case 'AGENT':
              this.router.navigate(['agent/dashboard']);
              break;
            default:
              this.errorMessage = 'Rôle inconnu. Veuillez contacter l\'administrateur.';
          }
        },
        error: () => this.errorMessage = 'Email ou mot de passe incorrect'
      });
    }
  }
  
}
