import {Component, OnInit} from '@angular/core';
import {EndUserService} from '../services/enduser.service';
@Component({
	selector: 'forgot-password',
	templateUrl: '/templates/forgotPassword.html'
})
export class ForgotPasswordModal implements OnInit {
	private resetEmail: string;
	private forgotPassword: boolean;

	constructor(
		private endUserService: EndUserService
	) { };
	ngOnInit(): void {
		this.resetEmail = '';
		this.forgotPassword = false;
	};
	/**
	 * show forgot password modal
	 */
	showForgotPassword(): void {
		this.forgotPassword = true;
		// Adds additional height to body if on mobile
		if (window.innerWidth <= 768) {
			document.getElementsByTagName('body')[0].style.height = 'calc(100% + 400px)';
		}
	};
	/**
	 * hide forgot password modal
	 */
	hideForgotPassword(): void {
		this.forgotPassword = false;
		// Removes additional height to body if on mobile
		if (window.innerWidth <= 768) {
			document.getElementsByTagName('body')[0].style.height = 'calc(100% - 400px)';
		}
	};

	/**
	 * Send reset password email
	 */
	sendResetEmail(): void {
		console.log('send');
		this.endUserService.sendResetEmail(this.resetEmail)
			.catch((error) => console.log(error));
	}
};
