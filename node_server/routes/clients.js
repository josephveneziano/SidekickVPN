const exec = require('child_process').exec;
const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const Device = require('../models/Device');

// @route GET /api/clients
// @desc Get peer info for peer with public_key passed in req.body
router.get(
	'/',
	passport.authenticate('jwt', {
		session: false
	}),
	(req, res) => {
		const VPN_NAME = process.env.VPN_NAME || 'wgnet0';
		const { publicKey } = req.body;
		exec(`wg show ${VPN_NAME} dump`, (err, stdout, stderr) => {
			if (err) {
				console.error(err);
				res.status(500).json({ Error: err });
				return;
			}
			const peers = stdout.split('\n').map(peer => peer.split('\t'));

			const peer = peers.find(peer => peer[0] === publicKey);
			if (peer) {
				res.status(200).json({
					publicKey: peer[0],
					endpoints: peer[2] === '(none)' ? null : peer[2],
					allowedIps: peer[3],
					latestHandshake: peer[4] === '0' ? null : peer[4],
					received: parseInt(peer[5]),
					sent: parseInt(peer[6]),
					persistentKeepalive: peer[7]
				});
			} else {
				res.status(404).json({ Error: 'Invalid Public Key' });
			}
		});
	}
);

// @route GET /api/clients/all
// @desc Get all devices for current client
// @access Private
router.get(
	'/all',
	passport.authenticate('jwt', {
		session: false
	}),
	async (req, res) => {
		const { _id } = req.user;
		try {
			// const user = await User.findOne({ _id });
			await User.findOne({ _id })
				.populate('devices')
				.exec((err, user) => {
					if (err) throw err;
					res.status(200).json({ devices: user.devices });
				});
		} catch (e) {
			console.log(e);
			res.status(500).json({ Error: 'Could not get devices' });
		}
	}
);

// @route POST /api/clients
// @desc Add device entry to DB and add peer to server
// @access Private
router.post(
	'/',
	passport.authenticate('jwt', {
		session: false
	}),
	async (req, res) => {
		const { name, publicKey, vpnIp } = req.body;
		const VPN_NAME = process.env.VPN_NAME || 'wgnet0';

		try {
			const { _id } = req.user;
			const newDevice = new Device({
				name,
				publicKey,
				vpnIp,
				user: _id
			});

			const device = await newDevice.save();

			// Update user with device reference
			await User.findOne({ _id })
				.populate('devices')
				.exec((err, user) => {
					user.devices.push(device);
					user.save();
				});

			// Add device to VPN server as a new peer
			await exec(
				`wg set ${VPN_NAME} peer ${publicKey} allowed-ips ${vpnIp.slice(
					0,
					vpnIp.length - 3
				)}/32`,
				(err, stdout, stderr) => {
					if (err) {
						console.error(err);
						res.status(500).json({ Error: err });
						return;
					}
					console.log(`Peer ${publicKey} added`);
					res.status(200).json({ Success: 'Device added', publicKey });
				}
			);
		} catch (e) {
			console.log(e);
		}
	}
);

// @route DELETE /api/clients
// @desc Remove peer from server
// @access Private
router.delete(
	'/:id',
	passport.authenticate('jwt', {
		session: false
	}),
	async (req, res) => {
		try {
			await Device.deleteOne({
				_id: req.params.id,
				user: req.user._id
			});

			res.status(200).json({ Deleted: 'Device removed' });
		} catch (e) {
			console.log(e);
			res.status(500).json({ Error: 'Error deleting device' });
		}
	}
);

module.exports = router;
