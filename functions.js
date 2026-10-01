const SQL = require("./sql");
const Variables = require("./modules/variables");
const Template = require("./modules/template");
const Axios = require("axios");

const Functions = {
	/**
	 * @param { string } type Type of page, admin, games, or general
	 * @param { string } body Body of page
	 * @param { string } path Path of page
	 * @param { boolean } contentOnly Compile to complete HTML or just content
	 * @returns { string } Compiled body of page
	 */
	Page_Compile: function (type = "public", body, path, contentOnly = false) {
		const ApplyTemplate = function(type, body)
		{
			body =
				"<!DOCTYPE html>" +
					"<html " + Template.Data.Configuration + ">" +
						"<head>" +
							(type == "admin" ? Template.Data.Head_Admin : Template.Data.Head) +
						"</head>" +
						"<body>" +
							(type == "admin" ? Template.Data.Body_Admin : Template.Data.Body) +
							Template.Data.Title +
						"</body>" +
					"</html>";

			return body;
		}

		const content = body;

		if (contentOnly == false)
			body = ApplyTemplate(type, body);

		body = 
			body
				.replace("<#? content ?#>", content)
				.replace("<#? navigation ?#>", (type == "admin" ? Template.Data.Navigation_Admin : Template.Data.Navigation))
				.replace("<#? appsettings ?#>", Template.Data.Settings)
				.replaceAll("<#? apptitle ?#>", Variables.AppTitle)
				.replaceAll("<#? apptitleadmin ?#>", Variables.AppTitleAdmin)
				.replaceAll("<#? appicon ?#>", Variables.AppIcon)
				.replaceAll("<#? appiconmonochrome ?#>", Variables.AppIconMonochrome)
				.replaceAll("<#? appassets ?#>", Variables.AppAssets)
				.replaceAll("<#? apphomepage ?#>", Variables.WebHomepage)
				.replaceAll("<#? apphost ?#>", Variables.WebHost)
				.replaceAll("<#? appversion ?#>", Variables.Version)

		let hrefLang = "<link rel='alternate' hreflang='x-default' href='" + Variables.WebHost + "/" + path + "'>";

		body = body.replaceAll("<#? hreflang ?#>", hrefLang);

		const pageVariables = 
		[
			{ prefix: "ad-title", replacement: "page_title", default: Variables.AppTitle },
			{ prefix: "ad-name", replacement: "page_name", default: Variables.AppTitle },
			{ prefix: "ad-desc", replacement: "page_description" },
			{ prefix: "ad-keyword", replacement: "page_keywords" },
			{ prefix: "ad-thumbnail", replacement: "page_thumbnail" }
		];
		
		for (const variable of pageVariables)
		{
			variable.default = variable.default == null ? "" : variable.default;
			let pattern = new RegExp("<" + variable.prefix + ">(.*?)</" + variable.prefix + ">", "g");
			let result = pattern.exec(body);
			let elements = body.match(pattern);

			if (result != null && result[1].trim() != "")
			{
				body = body.replaceAll("<#? " + variable.replacement + " ?#>", result[1])
				for (let element of elements)
					body = body.replaceAll(element, "");
			}
			else
				body = body.replaceAll("<#? " + variable.replacement + " ?#>", variable.default)
		}

		return body;
	},
	/**
	 * Listens to all registered routes
	 * @param { import("express").Application } Server Express instance
	 * @returns { void }
	 */
	Server_Start: function (Server) {
		Server.listen(618, function() {
			if (Variables.Production)
				console.log("Server is ready");
			else
				console.log("Server for development is ready. Go to http://localhost:618");
		});
	}
}

module.exports = Functions;