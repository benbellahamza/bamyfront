import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private baseUrl = 'http://localhost:8085/auth'; // adapte selon ton backend

  constructor(private http: HttpClient) { }

  login(email: string, password: string): Observable<any> {
    const body = { email, password };
  
    return this.http.post(`${this.baseUrl}/login`, body).pipe(
      tap((res: any) => {
        if (res && res['access-token'] && res['role']) {
          localStorage.setItem('access-token', res['access-token']);
          localStorage.setItem('role', res['role']);
        } else {
          console.warn("Login response is missing token or role:", res);
        }
      })
    );
  }
  

  logout(): void {
    localStorage.removeItem('access-token');
    localStorage.removeItem('role');
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
}
