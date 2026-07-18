

$(function () {
  "use strict";


  /* scrollar */

///  new PerfectScrollbar(".notify-list")

  ///new PerfectScrollbar(".search-content")

  // new PerfectScrollbar(".mega-menu-widgets")



  /* toggle button */

  $(".btn-toggle").click(function () {
    $("body").hasClass("toggled") ? ($("body").removeClass("toggled"), $(".sidebar-wrapper").unbind("hover")) : ($("body").addClass("toggled"), $(".sidebar-wrapper").hover(function () {
      $("body").addClass("sidebar-hovered")
    }, function () {
      $("body").removeClass("sidebar-hovered")
    }))
  })




  /* menu */

  $(function () {
    $('#sidenav').metisMenu();
  });

  $(".sidebar-close").on("click", function () {
    $("body").removeClass("toggled")
  })



  /* dark mode button */

  $(".dark-mode i").click(function () {
    $(this).text(function (i, v) {
      return v === 'dark_mode' ? 'light_mode' : 'dark_mode'
    })
  });


  $(".dark-mode").click(function () {
    $("html").attr("data-bs-theme", function (i, v) {
      return v === 'dark' ? 'light' : 'dark';
    })
  })


  /* sticky header */

  $(document).ready(function () {
    $(window).on("scroll", function () {
      if ($(this).scrollTop() > 60) {
        $('.top-header .navbar').addClass('sticky-header');
      } else {
        $('.top-header .navbar').removeClass('sticky-header');
      }
    });
  });


  /* email */

  $(".email-toggle-btn").on("click", function() {
    $(".email-wrapper").toggleClass("email-toggled")
  }), $(".email-toggle-btn-mobile").on("click", function() {
    $(".email-wrapper").removeClass("email-toggled")
  }), $(".compose-mail-btn").on("click", function() {
    $(".compose-mail-popup").show()
  }), $(".compose-mail-close").on("click", function() {
    $(".compose-mail-popup").hide()
  }),


  /* chat */

  $(".chat-toggle-btn").on("click", function() {
    $(".chat-wrapper").toggleClass("chat-toggled")
  }), $(".chat-toggle-btn-mobile").on("click", function() {
    $(".chat-wrapper").removeClass("chat-toggled")
  }),



  /* switcher */

  $("#BlueTheme").on("click", function () {
    $("html").attr("data-bs-theme", "blue-theme")
  }),

  $("#LightTheme").on("click", function () {
    $("html").attr("data-bs-theme", "light")
  }),

    $("#DarkTheme").on("click", function () {
      $("html").attr("data-bs-theme", "dark")
    }),

    $("#SemiDarkTheme").on("click", function () {
      $("html").attr("data-bs-theme", "semi-dark")
    }),

    $("#BoderedTheme").on("click", function () {
      $("html").attr("data-bs-theme", "bodered-theme")
    })


    /* search control */

      // Otvaranje pretrage na klik u polje za unos
      $(".search-control").click(function (e) {
        e.stopPropagation(); // Sprečava da se klik odmah prenese na dokument i zatvori prozor
        $(".search-popup").addClass("d-block");
        $(".search-close").addClass("d-block");
      });

      // Zatvaranje na klik na ikonicu X (desktop)
      $(".search-close").click(function (e) {
        e.stopPropagation();
        $(".search-popup").removeClass("d-block");
        $(".search-close").removeClass("d-block");
      });

      // Mobilna pretraga otvaranje
      $(".mobile-search-btn").click(function (e) {
        e.stopPropagation();
        $(".search-popup").addClass("d-block");
      });

      // Mobilna pretraga zatvaranje na X
      $(".mobile-search-close").click(function (e) {
        e.stopPropagation();
        $(".search-popup").removeClass("d-block");
      });

      // NOVO: Zatvaranje pretrage kada se klikne bilo gde sa strane (van search zone)
      $(document).on("click", function (event) {
        var $searchBar = $(".search-bar");

        // Ako klik NIJE unutar .search-bar i NIJE unutar mobilnog dugmeta za pretragu
        if (!$searchBar.is(event.target) && $searchBar.has(event.target).length === 0 && !$(".mobile-search-btn").is(event.target) && $(".mobile-search-btn").has(event.target).length === 0) {

            // Gasimo pretragu sklanjanjem d-block klase kako tvoj šablon zahteva
            $(".search-popup").removeClass("d-block");
            $(".search-close").removeClass("d-block");
        }
      });



  /* menu active */

  $(function () {
    for (var e = window.location, o = $(".metismenu li a").filter(function () {
      return this.href == e
    }).addClass("").parent().addClass("mm-active"); o.is("li");) o = o.parent("").addClass("mm-show").parent("").addClass("mm-active")
  });



});
