import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private baseUrl = 'http://localhost:8085/auth';
  private apiUserUrl = 'http://localhost:8085/api/responsables';

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<any> {
    const body = { email, password };

    return this.http.post(`${this.baseUrl}/login`, body).pipe(
      tap((res: any) => {
        if (res && res['access-token']) {
          localStorage.clear(); // ✅ Vider toute ancienne session

          const token = res['access-token'];
          const role = this.decodeJWT(token)?.scope;

          localStorage.setItem('access-token', token);
          localStorage.setItem('role', role);

          // ✅ Redirection selon rôle
          if (role === 'ADMIN') {
            this.router.navigate(['/admin/dashboard']);
          } else if (role === 'AGENT') {
            this.router.navigate(['/agent/dashboard']);
          } else if (role === 'RESPONSABLE') {
            this.router.navigate(['/responsable/visiteur']);
          } else {
            console.warn('Rôle non reconnu');
          }
        } else {
          console.warn('Token JWT non trouvé dans la réponse');
        }
      })
    );
  }

  logout(): void {
    localStorage.clear(); // ✅ nettoie tout
    this.router.navigate(['/']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access-token');
  }

  getToken(): string | null {
    return localStorage.getItem('access-token');
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }

  /**
   * ✅ Décodage simple du JWT pour récupérer le rôle
   */
  private decodeJWT(token: string): any {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch (e) {
      console.error('Erreur de décodage du token', e);
      return null;
    }
  }

  /**
   * 🔐 Récupère les infos du responsable connecté via /api/responsables/me
   */
  getConnectedUser(): Observable<any> {
    return this.http.get(`${this.apiUserUrl}/me`);
  }
}
