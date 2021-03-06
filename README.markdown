Creating Modules to Work With Gloader
====

Overview and Features
----

Gloader is a JavaScript module loader that was created for the BBC Glow project (think "glow" + "loader" = "gloader"). It will work, however, just as well with any JavaScript library that follows the same module pattern.

There are several benefits to using Gloader versus simply including your JavaScript via script tags. The basic features of Gloader are:

 * Loads JavaScript modules either synchronously or asynchronously
 * Automatically loads all dependent modules in the dependancy chain
 * Automatically loads related CSS files for each module
 * Can automatically resolve module versions to the latest available
 * Works across servers, no same-server restrictions
 * Can sandbox loaded modules, keeping them out of the global namespace
 * Supports a very wide range of popular browsers

The prerequisite to these benefits is that you write your code according to Glow's module pattern.

Gloader's Idea of a "Module"
----

The JavaScript language does not include a module feature, but we can define our own modules in user code. Basically we are striving to have a chunk of related functionality in a self-contained package, a "module".

Modules need to provide some metadata to the loader, including: what library they belong to, which version identifier describes them, and what other modules they depend on. Finally a module needs to define a function (called a "builder") that will build and return the module object itself.

Gloader's Idea of a "Library"
----

A group of related modules are grouped together under a single library. The library itself is also a module, but what makes the library module special is that it can contain child modules. Every library must have exactly one library module.

An Example of a Library Module
----

As explained previously a library is actually a special kind of module, and you must have exactly one library module in your library. Bearing that in mind, when creating a new library you should start with the library module. It will follow a pattern that looks like this:

    // how to create a library
    gloader.library({
        name: "myLibrary",
        version: "1.0.0",
        builder: function () {
            // this is where you create your library module
            var myLibrary = {}; // <-- can be anything
            
            return myLibrary;
        }
    });

It is conventional that you use a variable-like name for your library but in fact the `name` can be any string containing any combination of characters except for the forward-slash character "/", which is reserved and has special meaning to Gloader.

Likewise the `version` identifier can be any string containing any characters except for the forward-slash. However if you follow the convention of using a version identifier pattern like: `<int>.<int>.<int>` you will gain special functionality from Gloader in which it can automatically manage version updates for you (this will be discussed later).

The `builder` function is where you actually create your library object. You can execute any code you like inside the builder, but it is recommended that you create a function-scoped object by using the `var` keyword as shown and then return a reference to it at the end of the builder function. Following this pattern will allow Gloader to "sandbox" your library so that people can eventually maintain multiple versions of a single library on the single page.

An Example of a Module
----

Once you have a library you can proceed to attach modules to it. The process of defining a module is very similar to that of defining a library:

    // how to create a module
    gloader.module({
        name: 'myLibrary.myModule',
        library: ['myLibrary', '1.0.0'],
        
        builder: function(myLibrary) {
            myLibrary.myModule = {};
        }
    });

The difference is that a module must define what library (library name and library version) it belongs to. Notice that a module does not have it's own version identifier, instead modules always inherit their version identifiers from their library. Therefore this module, named "myLibrary.myModule", is version "1.0.0".

As with the library module definition, the module definition has a builder function, however the builder for a module will always receive a single argument: the library object which was returned from the library's builder. To the library object and you can attach your module object.

Dependencies
----

Any module definition can optionally list other modules as dependencies. For example, if you were to define a second module that depended on the module we defined in the previous section, it would be written like so:

    gloader.module({
        name: 'myLibrary.myOtherModule',
        library: ['myLibrary', '1.0.0'],
        depends: [
            ['myLibrary', '1.0.0', 'myLibrary.myModule']
        ],
        
        builder: function(myLibrary) {
            myLibrary.myOtherModule = {};
        }
    });

The `depends` option is an array of arrays: the inner arrays define the dependent library name, library version, and zero or more modules from that library. Variations on that could be written like so:

    // only need the library
    depends: [
        ['myLibrary', '1.0.0']
    ]
    
    // need several modules from the same library
    depends: [
        ['myLibrary', '1.0.0', 'myLibrary.myModule', 'myLibrary.Etc']
    ]
    
    //need modules from the several libraries
    depends: [
        ['myLibrary', '1.0.0', 'myLibrary.myModule', 'myLibrary.Etc'],
        ['myOtherLibrary', '1.2.0', 'myOtherLibrary.myModule']
    ]

Be warned that it is possible to configure the dependencies in set of modules such that none can ever be satisfied. This would happen if you were to create a circular dependency. For example if module A depends on module B while B also depends on A, it would be impossible for gloader to meet either requirement. It is left to the library designer to prevent this scenario and some planning in this regard is strongly recommended. Notice to that it is always implied that a module depends on its own library, so, to prevent a circular dependency, you should never make a library depend on one of its own modules (a well-designed library module should not depend on any module).

The File Map
----

When interacting with gloader you will refer to modules by their name and version, but in order for the source code to be found by gloader it must know where the corresponding file is found, this information is defined in the library file map.

File Layout
----

It is recommended that you organise your files so that the entire library is contained below a single library folder (of course you may have as many sub folders as you wish within the library folder), and that you name the library folder the same as your library. So, to continue the example, I would place my library source files in a folder named `myLibrary`.

It isn't necessary that each module be in a separate file, you can combine and mix modules within files as you please. This will be transparent to the users of your library of course because they will simply request the modules they want by name. Within the library folder you should have a map file named "map.js" which will allow gloader to find the requested module source code.

Within the library folder you should have a single folder for each version of the library. These will have a name that corresponds exactly to the version identifier you used in your library definition.

At a level just above the library folder will sit the gloader.js file itself. By using this convention in organising your files you can greatly simplify working with gloader.

    gloader.js
    myLibrary/
    myLibrary/map.js
    myLibrary/1.0.0/
    myLibrary/1.0.1/

Creating a Map File
----

As described previously, the map file allows you to define which modules are in which files. It is conventional to put a single module in a single file, but this is not a requirement, in fact the whole point of the map file is to allow you to combine modules together as you wish without your users ever needing to even know about it.

For illustration purposes, assume we have laid our library source code out like so:

    myLibrary/map.js
    myLibrary/1.0.0/myLibrary.js
    myLibrary/1.0.0/myModule.js
    myLibrary/1.0.0/myOtherModule.js

We would then need to write our map file so that it associates the modules with their corresponding files. In this case it would look like this:

    gloader.map.add(
        "myLibrary",
        {
            $version                   : "1.0.0",
            "myLibrary"                : "{$base}myLibrary.js",
            "myLibrary.myModule"       : "{$base}myModule.js",
            "myLibrary.myOtherModule"  : "{$base}myOtherModule.js"
        }
    );

Notice that the general format is:

    "module name": "path to source code file"

Now you should be able to see that by altering these values we can name our files whatever we like, and can even put multiple modules in the same file.

Special Variables in Maps
----

In the preceding example you may have noticed some special properties that have names beginning with `$`. In a map definition any property that begins with the dollar-sign is a variable and its value may be interpolated inside other values. The `$base` property for example is, by default, the same directory where the `gloader.js` file is installed, plus the library name and version number. In the example above the $base would be: `mylibrary/{$version}/`.

Where does the value for $version come from? As you can see from the example map, we define the `$version` property in the map definition. So since we defined the $version to be `"1.0.0"`, the $base then becomes `"mylibrary/1.0.0/"` and the location of the myLibrary module then becomes `"mylibrary/1.0.0/myLibrary.js"`, which as it happens is exactly where we put it. Because the $base is built on the current location of the gloader.js file, you can safely move your library folder anywhere, and as long as it is in the same directory as gloader.js, everything will automatically continue to just work.

Be careful though when using special values inside other special values. For example you can include the $version in the value for your $base, like so:

    {
        $version                   : "1.0.0",
        $base                      : "/any/{$version}/js/",
        "myLibrary"                : "{$base}myLibrary.js",
        "myLibrary.myModule"       : "{$base}myModule.js",
        "myLibrary.myOtherModule"  : "{$base}myOtherModule.js"
    }

So, when resolving the location of the `myLibrary`module, gloader will first replace `{$version}` with "1.0.0" and then replace `{$base}` with `/any/1.0.0/js/`, and finally construct the filepath `/any/1.0.0/js/myLibrary.js`. These replacements always happen in a specific order so it's critical to know which special variables may contain which other special variables.

 * $name - by default this is the name of the library. The $name variable cannot contain references to any other variables.
 * $version - by default this is the latest mapped version of the library. May contain references to the $name variable, but no others.
 * $base - by default is `<gloader's directory>/{$name}/{$version}`. May contain references to the $name and $version variables, but no others.
 * All Others - you can add any additional special variables and set them to whatever values you wish, but those variables may only contain references to the three basic variables listed above.

Including a CSS File With a Module
----

If your JavaScript module requires a CSS file in order to work, you can add that to the appropriate map entry, and Gloader will automatically manage loading of that file as well.

    gloader.map.add(
        "myLibrary",
        {
            $version           : "1.0.0",
            "myLibrary"        : "{$base}myLibrary.js",
            "myLibrary.module" : ["{$base}module.js", "{$base}module.css"]
        }
    );

Adding More Versions to Your Map
----

If you release a new version of your library, this must be indicated in the map as well. However, if your new version has exactly the same file layout as the previous version you do not need to repeat all that information again, you only ever need to add what is different. So if your new version were named `1.0.1`, but the file layout was the same, you would only need to add a new version number:

    gloader.map.add(
        "myLibrary",
        {
            $version                   : "1.0.0",
            "myLibrary"                : "{$base}myLibrary.js",
            "myLibrary.myModule"       : "{$base}myModule.js",
            "myLibrary.myOtherModule"  : "{$base}myOtherModule.js"
        },
        {
            $version                   : "1.0.1"
        }
    );

In this case all the previous module to file mappings will be inherited by the new version, with of course the new version number substituted in the $base.As long as you don't change any module to file associations you can continue this pattern indefinitely, adding more versions as you go.

Adding or Removing Modules From Your Map
----

It is likely that eventually you will want to add or remove module to your map. Any differences from the previous version must be indicated in your map definition. If you want to add a new module, but all the other modules are the same, only add the new module to your version:

    gloader.map.add(
        "myLibrary",
        {
            $version                   : "1.0.0",
            "myLibrary"                : "{$base}myLibrary.js",
            "myLibrary.myModule"       : "{$base}myModule.js",
            "myLibrary.myOtherModule"  : "{$base}myOtherModule.js"
        },
        {
            $version                   : "1.0.1"
        },
        {
            $version                   : "1.2.0",
            "myLibrary.myNewModule"    : "{$base}myNewModule.js"
        }
    );

On the other hand if you wish to remove an existing module from a version, you can indicate this by setting it's file location to `null`. For example, this is how you would indicate that the ill-considered "myLibrary.myNewModule" was later removed from the library in version 1.3.0:

    gloader.map.add(
        "myLibrary",
        {
            $version                   : "1.0.0",
            "myLibrary"                : "{$base}myLibrary.js",
            "myLibrary.myModule"       : "{$base}myLibrary/myModule.js",
            "myLibrary.myOtherModule"  : "{$base}myLibrary/myOtherModule.js"
        },
        {
            $version                   : "1.0.1"
        },
        {
            $version                   : "1.2.0",
            "myLibrary.myNewModule"    : "{$base}myLibrary/myNewModule.js"
        },
        {
            $version                   : "1.3.0",
            "myLibrary.myNewModule"    : null
        }
    );

Keeping the Map Up-To-Date
----

It is important that your map accurately reflect the current file-layout of your library. Because it isn't possible to see a directory listing from within JavaScript, Gloader is in essence blind to what files are in the library folder, and the map is the only way for it to know what's "out there". Every time you add a new version release to your library you must indicate this in the map, otherwise Gloader will be unaware of it and thus won't be able to load it.

Including Gloader
----

Once you have defined your library and modules, and created a map, you are ready to utilise gloader to load your modules. In a web page, add a `script` tag with a `src` attribute that points to your gloader.js file. Inside that same tag, add a call to the `gloader.use()` method.

    <script src="gloader.js" type="text/javascript">
        gloader.use("myLibrary");
    </script>

This will initialise the global `gloader` object and will tell it to read the map data about your library. By default that map is assumed to be relative the gloader.js file, in a folder named after the library, and in a file named "map.js". If your map is actually somewhere else, you must indicate that like so:

    <script src="gloader.js" type="text/javascript">
        gloader.use("myLibrary",
            { map: "somewhere/else/mymap.js" }
        );
    </script>

Loading Modules
----

Once you have initialised the `gloader` object, you can use it to load modules. To load just the library module, use a syntax like this:

    <script src="gloader.js" type="text/javascript">
        gloader.load(["myLibrary", "1.3.0"]);
    </script>

Or load specific modules like so:

    <script src="gloader.js" type="text/javascript">
        gloader.load(["myLibrary", "1.3.0", "myModule", "myOtherModule"]);
    </script>

Getting the Latest Version
----

If you give your modules version identifiers that follow a pattern of three dotted integers, like 1.2.3, you can take advantage of Gloader's ability to automatically load the latest available version when you request a non-specific version of a module. For example if your web page requests version "1" of a module (without specifying the minor version), Gloader will find the version of that module with a major version of "1", and _the highest available minor version_.

    <script src="gloader.js" type="text/javascript">
        gloader.load(["myLibrary", "1", "myModule"]); // latest version of 1.x
    </script>

This system works for minor versions too, so requesting "1.2" will load the latest bugfix version with a major and minor version of "1.2". Of course if your specify a full version like "1.0.0" Gloader will load exactly that version.

When Things Go Wrong
----

Even the best laid plans can sometimes suffer problems. If your module isn't appearing, even though you asked Gloader to load it, there are a few things you can try. Firstly, it isn't possible for Gloader to detect a 404 "Not Found" error from your server. In cases where a module is requested but it never arrives, Gloader will patiently wait forever, or at least long enough for your browser to give up. In these cases a look at FireBug's "Network" tab will tell you if one of your files is cannot be found.

If you try to load a module which is not listed in your map file (for example if you misspelled the name), this is obviously a mistake that Gloader can detect immediately and you will see an error message like: 'The gloader map is missing a JavaScript filepath for the module: mispeld/1.0.0/myModule. Maps included are: myLibrary/map.js'. This tells you the path to the map from which Gloader is working, and the libraryname, version and module name which can't be found in that map.

In some cases it might be useful to tell Gloader that it should not wait forever for modules which are not available from the server. You can provide a "onTimeout" option which is a callback function that will be executed whenever a requested module does not arrive in less than 20 seconds. If you think 20 seconds is too long to wait, you can also provide a "timeout" option, which is the number of milliseconds to wait before running the callback.

Going Around Gloader
----

You may wish to write your modules so that they can be used with or without Gloader. If your users don't have the `gloader` object defined in their web page, then trying to call `gloader.library()` or `gloader.module()` is obviously not going to work. To accommodate this you could write your modules to check for the problem and work around it:

    (function() {
        var builder = function(myLibrary) {
            myLibrary.myModule = {};
        };
        
        if (typeof gloader != "undefined") {
            gloader.module({
                name: 'myLibrary.myModule',
                library: ['myLibrary', '1.0.0'],
                
                builder: builder
            });
        }
        else {
            builder(myLibrary);
        }
    })();

By using this pattern you allow your users to include your module via `gloader.load()` or optionally via a simple script tag. Of course, without Gloader's help it is left up to the user to manage loading of dependencies in the right order. for example, here we are assuming that a global object named `myLibrary` is defined already.

There is a special error case that is worth mentioning here, and it arises when you have the `gloader` object defined in your webpage but try to include a module from your library by using a script tag anyway. In that case Gloader will still "receive" the module anyway, whether you intended it to or not (because `gloader` will be defined, the logic says it will get it's `module()` method called). In this case Gloader will notify you of the problem by throwing an error with a message that says so. the only remedy for this is to avoid the situation in the first place by only loading modules via script tags before (or as an alternative to) you include Gloader on your page. 