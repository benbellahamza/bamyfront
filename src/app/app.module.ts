import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Composants globaux
import { NavbarComponent } from './shared/components/navbar/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer/footer.component';

// Composants Visiteurs
import { FormComponent } from './shared/pages/visiteur/form/form.component';
import { ListComponent } from './shared/pages/visiteur/list/list.component';
import { AjouterVisiteurPageComponent } from './shared/pages/visiteur/ajouter-visiteur-page/ajouter-visiteur-page.component';

// Auth & Sécurité
import { LoginComponent } from './core/auth/login/login.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

// Livraisons
import { LivraisonFormComponent } from './shared/pages/livraison/livraison-form/livraison-form.component';
import { LivraisonListComponent } from './shared/pages/livraison/livraison-list/livraison-list.component';

// Dashboards et gestion
import { DashboardAgentComponent } from './shared/pages/agent/dashboard-agent/dashboard-agent.component';
import { DashboardAdminComponent } from './shared/pages/admin/dashboard-admin/dashboard-admin.component';
import { AjouterUtilisateurComponent } from './shared/pages/admin/ajouter-utilisateur/ajouter-utilisateur.component';
import { ResponsableVisiteurComponent } from './shared/pages/responsable/responsable-visiteur/responsable-visiteur.component';
import { ResponsableLivraisonComponent } from './shared/pages/responsable/responsable-livraison/responsable-livraison.component';

import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    FooterComponent,
    FormComponent,
    ListComponent,
    AjouterVisiteurPageComponent, // 💡 Wrapper
    LoginComponent,
    LivraisonFormComponent,
    LivraisonListComponent,
    DashboardAgentComponent,
    DashboardAdminComponent,
    AjouterUtilisateurComponent,
    ResponsableVisiteurComponent,
    ResponsableLivraisonComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
