import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:8085/api/admins';

  constructor(private http: HttpClient) {}

  /**
   * ✅ Ajouter un nouvel utilisateur
   */
  ajouterUtilisateur(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/ajouter-utilisateur`, userData);
  }

  /**
   * ✅ Récupérer tous les utilisateurs ayant un rôle
   */
  getUtilisateurs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/utilisateurs`);
  }

  /**
   * ✅ Modifier les infos d’un utilisateur
   */
  modifierUtilisateur(id: number, userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/modifier-utilisateur/${id}`, userData);
  }

  /**
   * ✅ Réinitialiser le mot de passe d’un utilisateur (admin vers autre utilisateur)
   */
  reinitialiserMotDePasse(id: number, newPassword: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/reinitialiser-motdepasse/${id}`, {
      newPassword
    });
  }

  /**
   * ✅ Activer / désactiver un utilisateur
   */
  toggleActivation(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/desactiver-utilisateur/${id}`, {});
  }

  /**
   * ✅ Récupérer l’historique des actions effectuées par les agents
   */
  getHistoriqueActions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/historique`);
  }

  /**
   * ✅ Changer le mot de passe de l’utilisateur connecté (par lui-même)
   */
  changerMotDePasseActuel(email: string, ancienMotDePasse: string, nouveauMotDePasse: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/changer-motdepasse`, {
      email,
      ancienMotDePasse,
      nouveauMotDePasse
    });
  }
}
