module.exports = function(grunt) {
    var newVersion = grunt.option('newver') || '1.0.0';
    var destFolder = grunt.option('dest') || 'LetMeWatchThis(Release)';
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        
        /*Minifying JS files*/
        uglify: {
            options: {
                mangle:true,
                preserveComments:false,
                compress:true
            },
            minify_background: {
                src: "background.js",
                dest: destFolder + "/background.min.js"
            },
            minify_popup: {
                src: "popup.js",
                dest: destFolder+"/popup.min.js"
            },
            /*options.js not being minsafe, after minification options page gives an error and stops working; so not minifying as of now.*/
            /*(minify_options: {
                src: "options.js",
                dest: destFolder+"/options.min.js"
            }*/
        },

        /*Combining library JS files: This does not work; keeping lib files separate*/
        /*concat: {
            concat_libs: {
                src: ['js/angular.min.js','js/bootstrap.min.js','js/jquery-2.0.3.min.js','js/ui-bootstrap-tpls-0.6.0.min.js'],
                dest: destFolder+"/lib.min.js"
            }
        },*/

        /*Minify and Combine CSS files*/
        cssmin: {
            concat_css: {
                src: ['css/bootstrap.min.css','css/monitorStylesheet.css'],
                dest: destFolder+"/styles.min.css"
            }
        },
        
        /*Copying ICON and IMAGE files*/
        copy: {
            copy_task: {
                files: [
                    {expand:true, src:'*.png', dest:destFolder, filter:'isFile'},
                    {expand:true, src:'img/*', dest:destFolder, filter:'isFile'},
                    {expand:true, src:'manifest.json', dest:destFolder, filter:'isFile'},
                    {expand:true, src:'options.js', dest:destFolder, filter:'isFile'},
                    {expand:true, src:'js/*', dest:destFolder+"/lib", filter:'isFile',flatten:true}
                ]
            }
        },

        /*Update HTML files to refer minified files*/
        processhtml: {
            update_popup: {
                src: "popup.html",
                dest: destFolder+"/popup.html"
            },
            update_options: {
                src: "options.html",
                dest: destFolder+"/options.html"
            }
        },

        /*Update VERSION and background script in MANIFEST*/
        sed: {
            update_manifest_background: {
                path:destFolder+"/manifest.json",
                pattern: "background.js",
                replacement: "background.min.js",
                recursive:false
            },
            update_manifest_version: {
                path:destFolder+"/manifest.json",
                pattern: "[0-9].[0-9].[0-9]",
                replacement: newVersion,
                recursive:false  
            },
            update_info_panel: {
                path:destFolder+"/popup.html",
                pattern: "v[0-9].[0-9].[0-9]",
                replacement: "v"+newVersion,
                recursive:false 
            }
        },

        /*Zip up the release folder for upload*/
        compress: {
            options: {
                archive:destFolder+'(v'+newVersion+').zip',
                mode: 'zip'
            },
            zip_pkg: {
                src:destFolder+"/**"
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    /*grunt.loadNpmTasks('grunt-contrib-concat');*/
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-processhtml');
    grunt.loadNpmTasks('grunt-sed');
    grunt.loadNpmTasks('grunt-contrib-compress');

    grunt.registerTask('default', ['uglify','cssmin'/*,'concat'*/,'copy','processhtml','sed','compress']);
};