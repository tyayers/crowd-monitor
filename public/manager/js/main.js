AOS.init({
  duration: 800,
  easing: 'slide',
  once: true
});

/* AIRPORT START This block integrates the airport security logic */
jQuery(document).ready(function ($) {

  var iotRunning = false;
  var iotstream = undefined;
  var visionService = 0; // 0=google vision, 1=auto ml
  var imageType = "";
  //var functionsBaseUrl = "https://us-central1-airport-security.cloudfunctions.net";
  //var functionsBaseUrl = "https://airport-security-onv7eg4pxq-ew.a.run.app";
  var functionsBaseUrl = "";

  var checkpointId = undefined;
  fetch('/parameters')
    .then(response => response.json())
    .then(data => {
      if (data.checkpointId)
        checkpointId = data.checkpointId;
      if (data.baseServiceUrl)
        functionsBaseUrl = data.baseServiceUrl;
    })
    .finally(() => {
      var tempId = getUrlVars()["checkpoint"];
      if (tempId) checkpointId = tempId;

      if (checkpointId != undefined) {
        localStorage.setItem('checkpointId', checkpointId);
      }
      else {
        checkpointId = localStorage.getItem('checkpointId');
        if (!checkpointId || checkpointId == "undefined") {
          checkpointId = Math.floor(Math.random() * 10000);
          localStorage.setItem('checkpointId', checkpointId);
        }
      }

      $("#checkpointInput").val(checkpointId);

      // Get all comments for checkpoint
      fetch(functionsBaseUrl + "/data/checkpoints/" + checkpointId + "/surveys")
        .then(response => response.json())
        .then(data => {
          for (p = data.surveys.length - 1; p >= 0; p--) {
            var survey = data.surveys[p];
            var date = new Date(survey.timestamp);
            var newComments = "No comment";
            if (survey.comments) newComments = survey.comments;
            if (survey.participants) newComments = survey.participants + " - " + newComments;
            if (survey.satisfaction) newComments = "Rating (1-10): " + survey.satisfaction + " - " + newComments;
            $("#passenger-comments").append(`<div style="color: white">${date.toISOString()} - ${newComments}</div>`);
          }
        });
    });

  var es = new EventSource('/transport/alerts/stream');
  es.onmessage = function (event) {
    var data = JSON.parse(event.data);
    if (data.checkpointId == checkpointId && data.comments) {
      var date = new Date(data.timestamp);
      var comments = $("#passenger-comments").html();
      var newComments = "No comment";
      if (data.comments) newComments = data.comments;
      if (data.participants) newComments = data.participants + " - " + newComments;
      if (data.satisfaction) newComments = "Rating (1-10): " + data.satisfaction + " - " + newComments;
      $("#passenger-comments").html(`<div style="color: white">${date.toISOString()} - ${newComments}</div>` + comments);
    }
  }

  var offlineData = localStorage.getItem('offlineData');
  if (offlineData == "true") {
    $("#vision-select").prop("disabled", "disabled");
    document.getElementById("offline-switch").checked = true;
  }
  else {
    $("#vision-select").prop("disabled", false);
    document.getElementById("offline-switch").checked = false;
  }

  var video = document.querySelector("#videoElement");

  $("#settings-save-button").click(function () {
    checkpointId = $("#checkpointInput").val();
    localStorage.setItem('checkpointId', $("#checkpointInput").val());
  });

  // This starts the camera and processes the frames through the vision service
  $("#start-button").click(function () {

    iotRunning = !iotRunning;

    if (iotRunning) {
      // $("#canvas").hide();
      // $("#videoElement").show();
      imageType = "CAMERA";
      if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(function (stream) {
            video.srcObject = stream;
            iotstream = stream;
          })
          .catch(function (err0r) {
            console.log("Something went wrong!");
          });
      }

      $("#start-button").text("Stop Camera");
    }
    else {
      if (iotstream != null) {
        iotstream.getTracks().map(function (val) {
          val.stop();
        });
      }
      // $("#canvas").show();
      // $("#videoElement").hide();

      $("#start-button").text("Start Camera")
    }

  });

  $("#vision-select").change(function () {
    visionService = $("#vision-select").prop("selectedIndex");
  });

  $("#offline-switch").change(function () {
    var offlineData = document.getElementById("offline-switch").checked;
    localStorage.setItem('offlineData', offlineData);

    if (offlineData)
      $("#vision-select").prop("disabled", "disabled");
    else
      $("#vision-select").prop("disabled", false);
  });

  $(".test-image-select").click(function () {

    var imageSrc = $(this).children("img").prop("src");
    if (imageSrc.includes("crowd") || imageSrc.includes("moderate"))
      imageType = "CROWD";
    else
      imageType = "LOW";

    $('#pictures-modal').modal('hide')
    //$("#videoElement").prop("poster", imageSrc)

    var img = new Image();
    img.onload = draw;
    img.onerror = failed;
    img.src = imageSrc;
  });

  // Here we have a timer checking if we have new camera frames, and if yes processing them
  setInterval(() => {
    if (iotRunning) {
      var canvas = document.querySelector('canvas');
      canvas.width = 500;
      canvas.height = 375;

      var context = canvas.getContext('2d');

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      callSecurityVisionService();
    }
  }, 5000);

  // This block could be used again if a file dialog was opened to open local images (replaced with online selection)
  document.getElementById('inp').onchange = function (e) {
    var img = new Image();
    img.onload = draw;
    img.onerror = failed;
    img.src = URL.createObjectURL(this.files[0]);

    $("#videoElement").prop("poster", img.src);
  };

  // Draws the image onto the canvas, which is then sent to the vision service
  function draw() {
    var canvas = document.getElementById('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(this, 0, 0);

    callSecurityVisionService();
  }

  function failed() {
    console.error("The provided file couldn't be loaded as an Image media");
  }

  function callSecurityVisionService() {
    var visionEngine = "cloudvision";
    if (visionService == 1) visionEngine = "amlvision";

    var url = functionsBaseUrl + '/vision';

    const img = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
    const payload = {
      "requests": [
        { "image": { "content": img }, "features": [{ "maxResults": 50, "type": "OBJECT_LOCALIZATION" }] }
      ]
    };

    var data = JSON.stringify(payload);
    if (document.getElementById("offline-switch").checked) {
      var testData = "testdata/vision-crowd.json";
      if (imageType == "LOW")
        testData = "testdata/vision-low.json";

      $.get(testData, function (data) {
        evaluateVisionResult(data);
      });
    }
    else {
      $.ajax({
        type: "POST",
        url: url,
        headers: {
          "Content-Type": "application/json"
        },
        data: JSON.stringify(payload),
        success: function (data) {
          evaluateVisionResult(data);
        }
      });
    }
  }

  function evaluateVisionResult(data) {
    var crowd = "low";
    var labels = "";

    var peopleCount = 0;
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');

    for (var i in data.responses[0]["localizedObjectAnnotations"]) {
      var annotation = data.responses[0]["localizedObjectAnnotations"][i];

      if (i > 0)
        labels += ", "
      labels += annotation.name + ": " + annotation.score;

      if (annotation.name.toUpperCase() == "CROWD") {
        crowd = "high";
      }
      else if (annotation.name.toUpperCase() == "PERSON") {
        peopleCount++;

        // Red rectangle
        var x = annotation.boundingPoly.normalizedVertices[0].x * canvas.width;
        var y = annotation.boundingPoly.normalizedVertices[0].y * canvas.height;
        var width = (annotation.boundingPoly.normalizedVertices[1].x * canvas.width) - x;
        var height = (annotation.boundingPoly.normalizedVertices[3].y * canvas.height) - y
        ctx.beginPath();
        ctx.lineWidth = "4";
        // ctx.strokeStyle = "#f16821";
        ctx.strokeStyle = "lightgreen";
        ctx.rect(x, y, width, height);
        ctx.stroke();
      }
    }

    if (peopleCount >= 5)
      crowd = "high";

    if (crowd == "high") {
      $("#lowAlert").fadeOut();
      $("#highAlert").fadeIn();
    }
    else {
      $("#highAlert").fadeOut();
      $("#lowAlert").fadeIn();
    }
    var url = functionsBaseUrl + "/transport/alerts";

    fetch(url, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ checkpointId: checkpointId, congestion: crowd })
    });

    $("#status-label").text(labels);
  }

  function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
      vars[key] = value;
    });
    return vars;
  }

  /* AIRPORT END This block integrates the airport security logic, after this
  is just the template UI code, nothing to do with the airport logic */

  var siteMenuClone = function () {

    $('.js-clone-nav').each(function () {
      var $this = $(this);
      $this.clone().attr('class', 'site-nav-wrap').appendTo('.site-mobile-menu-body');
    });


    setTimeout(function () {

      var counter = 0;
      $('.site-mobile-menu .has-children').each(function () {
        var $this = $(this);

        $this.prepend('<span class="arrow-collapse collapsed">');

        $this.find('.arrow-collapse').attr({
          'data-toggle': 'collapse',
          'data-target': '#collapseItem' + counter,
        });

        $this.find('> ul').attr({
          'class': 'collapse',
          'id': 'collapseItem' + counter,
        });

        counter++;

      });

    }, 1000);

    $('body').on('click', '.arrow-collapse', function (e) {
      var $this = $(this);
      if ($this.closest('li').find('.collapse').hasClass('show')) {
        $this.removeClass('active');
      } else {
        $this.addClass('active');
      }
      e.preventDefault();

    });

    $(window).resize(function () {
      var $this = $(this),
        w = $this.width();

      if (w > 768) {
        if ($('body').hasClass('offcanvas-menu')) {
          $('body').removeClass('offcanvas-menu');
        }
      }
    })

    $('body').on('click', '.js-menu-toggle', function (e) {
      var $this = $(this);
      e.preventDefault();

      if ($('body').hasClass('offcanvas-menu')) {
        $('body').removeClass('offcanvas-menu');
        $this.removeClass('active');
      } else {
        $('body').addClass('offcanvas-menu');
        $this.addClass('active');
      }
    })

    $('body').on('click', '.js-menu-hide', function (e) {
      var $this = $(this);
      //e.preventDefault();

      if ($('body').hasClass('offcanvas-menu')) {
        $('body').removeClass('offcanvas-menu');
        $this.removeClass('active');
      }
      // else {
      // 	$('body').addClass('offcanvas-menu');
      // 	$this.addClass('active');
      // }
    })

    // click outisde offcanvas
    $(document).mouseup(function (e) {
      var container = $(".site-mobile-menu");
      if (!container.is(e.target) && container.has(e.target).length === 0) {
        if ($('body').hasClass('offcanvas-menu')) {
          $('body').removeClass('offcanvas-menu');
        }
      }
    });
  };
  siteMenuClone();


  var sitePlusMinus = function () {
    $('.js-btn-minus').on('click', function (e) {
      e.preventDefault();
      if ($(this).closest('.input-group').find('.form-control').val() != 0) {
        $(this).closest('.input-group').find('.form-control').val(parseInt($(this).closest('.input-group').find('.form-control').val()) - 1);
      } else {
        $(this).closest('.input-group').find('.form-control').val(parseInt(0));
      }
    });
    $('.js-btn-plus').on('click', function (e) {
      e.preventDefault();
      $(this).closest('.input-group').find('.form-control').val(parseInt($(this).closest('.input-group').find('.form-control').val()) + 1);
    });
  };
  // sitePlusMinus();


  var siteSliderRange = function () {
    $("#slider-range").slider({
      range: true,
      min: 0,
      max: 500,
      values: [75, 300],
      slide: function (event, ui) {
        $("#amount").val("$" + ui.values[0] + " - $" + ui.values[1]);
      }
    });
    $("#amount").val("$" + $("#slider-range").slider("values", 0) +
      " - $" + $("#slider-range").slider("values", 1));
  };
  // siteSliderRange();


  var siteMagnificPopup = function () {
    $('.image-popup').magnificPopup({
      type: 'image',
      closeOnContentClick: true,
      closeBtnInside: false,
      fixedContentPos: true,
      mainClass: 'mfp-no-margins mfp-with-zoom', // class to remove default margin from left and right side
      gallery: {
        enabled: true,
        navigateByImgClick: true,
        preload: [0, 1] // Will preload 0 - before current, and 1 after the current image
      },
      image: {
        verticalFit: true
      },
      zoom: {
        enabled: true,
        duration: 300 // don't foget to change the duration also in CSS
      }
    });

    $('.popup-youtube, .popup-vimeo, .popup-gmaps').magnificPopup({
      disableOn: 700,
      type: 'iframe',
      mainClass: 'mfp-fade',
      removalDelay: 160,
      preloader: false,

      fixedContentPos: false
    });
  };
  siteMagnificPopup();


  var siteCarousel = function () {
    if ($('.nonloop-block-13').length > 0) {
      $('.nonloop-block-13').owlCarousel({
        center: false,
        items: 1,
        loop: true,
        stagePadding: 0,
        margin: 0,
        autoplay: true,
        nav: true,
        navText: ['<span class="icon-arrow_back">', '<span class="icon-arrow_forward">'],
        responsive: {
          600: {
            margin: 0,
            nav: true,
            items: 2
          },
          1000: {
            margin: 0,
            stagePadding: 0,
            nav: true,
            items: 3
          },
          1200: {
            margin: 0,
            stagePadding: 0,
            nav: true,
            items: 4
          }
        }
      });
    }

    $('.slide-one-item').owlCarousel({
      center: false,
      items: 1,
      loop: true,
      stagePadding: 0,
      margin: 0,
      autoplay: true,
      pauseOnHover: false,
      nav: true,
      navText: ['<span class="icon-keyboard_arrow_left">', '<span class="icon-keyboard_arrow_right">']
    });
  };
  siteCarousel();

  var siteStellar = function () {
    $(window).stellar({
      responsive: false,
      parallaxBackgrounds: true,
      parallaxElements: true,
      horizontalScrolling: false,
      hideDistantElements: false,
      scrollProperty: 'scroll'
    });
  };
  siteStellar();

  // var windowScroll = function() {

  //    $(window).scroll(function(){
  //      var $win = $(window);
  //      if ($win.scrollTop() > 200) {
  //        $('.js-site-header').addClass('scrolled');
  //      } else {
  //        $('.js-site-header').removeClass('scrolled');
  //      }

  //    });

  //  };
  //  windowScroll();

  var siteCountDown = function () {

    $('#date-countdown').countdown('2020/10/10', function (event) {
      var $this = $(this).html(event.strftime(''
        + '<span class="countdown-block"><span class="label">%w</span> weeks </span>'
        + '<span class="countdown-block"><span class="label">%d</span> days </span>'
        + '<span class="countdown-block"><span class="label">%H</span> hr </span>'
        + '<span class="countdown-block"><span class="label">%M</span> min </span>'
        + '<span class="countdown-block"><span class="label">%S</span> sec</span>'));
    });

  };
  siteCountDown();

  var siteDatePicker = function () {

    if ($('.datepicker').length > 0) {
      $('.datepicker').datepicker();
    }

  };
  siteDatePicker();

  // scroll
  var scrollWindow = function () {
    $(window).scroll(function () {
      var $w = $(this),
        st = $w.scrollTop(),
        navbar = $('.js-site-navbar'),
        sd = $('.js-scroll-wrap'),
        toggle = $('.site-menu-toggle');

      if (toggle.hasClass('open')) {
        $('.site-menu-toggle').trigger('click');
      }


      if (st > 150) {
        if (!navbar.hasClass('scrolled')) {
          navbar.addClass('scrolled');
        }
      }
      if (st < 150) {
        if (navbar.hasClass('scrolled')) {
          navbar.removeClass('scrolled sleep');
        }
      }
      if (st > 350) {
        if (!navbar.hasClass('awake')) {
          navbar.addClass('awake');
        }

        if (sd.length > 0) {
          sd.addClass('sleep');
        }
      }
      if (st < 350) {
        if (navbar.hasClass('awake')) {
          navbar.removeClass('awake');
          navbar.addClass('sleep');
        }
        if (sd.length > 0) {
          sd.removeClass('sleep');
        }
      }
    });
  };
  scrollWindow();


  // navigation
  var OnePageNavigation = function () {
    var navToggler = $('.site-menu-toggle');
    $("body").on("click", "#site-navbar .site-menu li a[href^='#'], .smoothscroll[href^='#'], .site-mobile-menu .site-nav-wrap li a", function (e) {

      if (e.target.href.startsWith("#")) {
        e.preventDefault();
        var hash = this.hash;

        $('html, body').animate({

          scrollTop: $(hash).offset().top
        }, 400, 'easeInOutExpo', function () {
          window.location.hash = hash;
        });
      }
    });

    // $("#menu li a[href^='#']").on('click', function(e){
    //   e.preventDefault();
    //   navToggler.trigger('click');
    // });

    $('body').on('activate.bs.scrollspy', function () {
      // console.log('nice');
      // alert('yay');
    })
  };

  OnePageNavigation();

});