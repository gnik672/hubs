AFRAME.registerComponent('disable-hover-if-not-presenter', {
    init: function () {
      const presenters = ["presenter-1", "presenter-2", "presenter-3", "presenter-4"];
      const userName = window.APP?.store?.state?.profile?.displayName;

      if (!presenters.includes(userName)) {
        // Remove interaction from all hoverable items
        const hoverTargets = document.querySelectorAll('[is-remote-hover-target]');
        hoverTargets.forEach(el => {
          el.removeAttribute('is-remote-hover-target');
          el.removeAttribute('hoverable-visuals');
        });

        // Hide drawing pen or tools
        const pens = document.querySelectorAll('[pen]');
        pens.forEach(el => {
          el.setAttribute('visible', 'false');
        });

        // Optionally disable controller/hand interaction
        const interactables = document.querySelectorAll('.interactable');
        interactables.forEach(el => {
          el.removeAttribute('tags');
        });
      }
    }
  });
