import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const token = localStorage.getItem('access-token');

    if (!token) {
      this.router.navigate(['/']);
      return false;
    }

    try {
      const payload = token.split('.')[1];
      const decodedPayload = atob(payload);
      const payloadObj = JSON.parse(decodedPayload);

      const role = payloadObj.scope || payloadObj.role; // adapte si ton JWT contient une autre clé
      const allowedRoles = route.data['roles'] as string[];

      if (allowedRoles.includes(role)) {
        return true;
      } else {
        this.router.navigate(['/']);
        return false;
      }

    } catch (e) {
      console.error('Erreur de décodage du token :', e);
      this.router.navigate(['/']);
      return false;
    }
  }
}
